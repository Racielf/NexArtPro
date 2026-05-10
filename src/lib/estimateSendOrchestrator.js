import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { markEstimateSent } from '@/lib/estimateSalesLifecycle';
import { createSigningPackageForEstimate } from '@/lib/nexArtSign';
import { validateEstimatePricing, checkAttachmentCompleteness } from '@/lib/pricingValidation';
import { validateDocTypeFields } from '@/lib/documentTypeConfig';
import { logComm, logCommFailed } from '@/lib/commTracking';
import { logSend, logBelowCostOverride } from '@/lib/estimateAuditLog';
import { generateEstimatePdfBase64 } from '@/lib/estimatePrint';
import { recordSuccessfulTransmission, recordFailedTransmission } from '@/lib/estimateTransmission';
import { getLocalUser, normalizeLocalRole } from '@/lib/roleUtils';

function resolveAuthorizedSender(currentUser = null) {
  const localUser = getLocalUser();
  const fallbackRole = normalizeLocalRole(localUser?.role);
  const fallbackName = localUser?.display_name || localUser?.username || '';

  const senderName = currentUser?.full_name
    || currentUser?.display_name
    || currentUser?.name
    || currentUser?.email
    || fallbackName
    || 'Authorized Representative';

  const senderEmail = currentUser?.email || localUser?.username || '';
  const senderRole = normalizeLocalRole(currentUser?.role) || fallbackRole || 'admin';

  return {
    full_name: senderName,
    display_name: senderName,
    email: senderEmail,
    role: senderRole,
  };
}

export async function validateBeforeSend(estimate, recipientEmail) {
  if (!recipientEmail) return { valid: false, errors: ['Recipient email is required'] };
  const dtv = validateDocTypeFields(estimate);
  if (!dtv.valid) return { valid: false, errors: dtv.errors };
  return { valid: true, pricingWarning: validateEstimatePricing(estimate), attachmentWarning: checkAttachmentCompleteness(estimate) };
}

function getSelectedClientAttachments(estimate, includedAttachmentIds = []) {
  const included = Array.isArray(includedAttachmentIds) ? includedAttachmentIds : [];
  return (Array.isArray(estimate?.attachments) ? estimate.attachments : [])
    .filter(att => att?.intent === 'send_to_client')
    .filter(att => included.includes(att.id))
    .filter(att => att?.file_url)
    .map(att => ({ filename: att.file_name || 'Attachment', url: att.file_url }));
}

function base64ToPdfBlob(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

async function sha256HexFromBase64(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function executeSend({ estimate, recipientEmail, subject, message, currentTemplate, currentOptions, includedAttachmentIds = [], appConfig }) {
  if (!recipientEmail) throw new Error('Recipient email is required');

  const documentConfig = { template: currentTemplate, options: currentOptions, included_attachment_ids: Array.isArray(includedAttachmentIds) ? includedAttachmentIds : [] };
  const ts = new Date().toISOString();
  let pdfUrl = null;
  let pdfFilename = null;
  let pdfHash = '';

  // ── A. PDF generation — MANDATORY ──────────────────────────────────────────
  let generatedPdf;
  try {
    generatedPdf = await generateEstimatePdfBase64(estimate, currentOptions, currentTemplate);
  } catch (err) {
    throw new Error(`PDF generation failed: ${err?.message || 'unknown error'}`);
  }
  if (!generatedPdf?.base64) {
    throw new Error('PDF generation failed — base64 output is empty. Cannot send estimate.');
  }
  pdfFilename = generatedPdf.filename || `Estimate-${estimate?.estimate_number || 'document'}.pdf`;
  try {
    pdfHash = await sha256HexFromBase64(generatedPdf.base64);
  } catch (err) {
    throw new Error(`PDF hash computation failed: ${err?.message}`);
  }

  // ── B. PDF upload to Supabase Storage — MANDATORY ──────────────────────────
  try {
    const blob = base64ToPdfBlob(generatedPdf.base64);
    const filename = `estimates/${estimate.id || Date.now()}/${pdfFilename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filename, blob, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
    pdfUrl = urlData?.publicUrl || null;
    if (!pdfUrl) throw new Error('Storage returned no public URL after upload');
  } catch (err) {
    throw new Error(`PDF upload to storage failed: ${err?.message}. Cannot create signing package without a valid PDF URL.`);
  }

  let currentUser = null;
  try { currentUser = await base44.auth.me().catch(() => null); } catch {}
  currentUser = resolveAuthorizedSender(currentUser);

  // ── C. Create signing package — requires pdfUrl ──────────────────────────
  let signingPackage = null;
  let finalLink = '';
  // pdfUrl is now guaranteed to be non-null by section B above
  signingPackage = await createSigningPackageForEstimate({
    estimate,
    pdfUrl,
    pdfName: pdfFilename,
    pdfHash,
    currentUser,
  });

  finalLink = signingPackage?.signing_url || '';

  // ── D. Validate signing link before sending email ─────────────────────────
  if (!finalLink || !finalLink.includes('/sign-document?token=')) {
    throw new Error(
      `Signing link is invalid or missing. Got: "${finalLink}". ` +
      'Email will NOT be sent without a valid /sign-document?token= link.'
    );
  }

  // ── E. Build email attachments ────────────────────────────────────────────
  const emailAttachments = [];
  emailAttachments.push({
    filename: pdfFilename,
    content: generatedPdf.base64,
    contentType: 'application/pdf',
  });
  emailAttachments.push(...getSelectedClientAttachments(estimate, includedAttachmentIds));

  // ── F. Send email ─────────────────────────────────────────────────────────
  let emailRes;
  try {
    emailRes = await base44.functions.invoke('sendEstimateEmail', {
      to: recipientEmail,
      subject,
      message,
      client_link: finalLink,
      client_name: estimate?.client_name || '',
      estimate_number: estimate?.estimate_number || '',
      total: estimate?.total || 0,
      from_name: appConfig.company.name || 'R.C Art Construction LLC',
      attachments: emailAttachments,
    });
  } catch (err) {
    throw new Error(`Email service error: ${err?.message}`);
  }
  if (emailRes.data?.error) throw new Error(emailRes.data.error);

  // ── G. Persist estimate state — critical fields NOT silenced ──────────────
  let snapshotId = null;
  try {
    await markEstimateSent(estimate.id, { documentConfig, estimate, currentUser });
  } catch (err) {
    console.warn('[executeSend] markEstimateSent failed (non-critical):', err?.message);
  }

  // Critical: signing_package_id and signature_status MUST persist
  await base44.entities.Estimate.update(estimate.id, {
    signing_package_id: signingPackage.id,
    signature_status: 'sent',
    document_hash: pdfHash,
    document_hash_algorithm: 'SHA-256',
    company_signature_name: currentUser.full_name || estimate.company_signature_name || '',
    company_signature_email: currentUser.email || estimate.company_signature_email || '',
    company_signature_role: currentUser.role || estimate.company_signature_role || '',
    company_signed_at: estimate.company_signed_at || ts,
  });
  // Note: no .catch() — if this fails the caller must know

  try {
    const snapshots = await base44.entities.EstimateSnapshot.filter({ estimate_id: estimate.id }, '-created_date', 1).catch(() => []);
    if (snapshots?.length) snapshotId = snapshots[0].id;
  } catch {}

  if (pdfUrl && snapshotId) {
    try {
      await base44.entities.EstimateSnapshot.update(snapshotId, {
        pdf_file_url: pdfUrl,
        pdf_file_name: pdfFilename,
        pdf_file_hash: pdfHash,
        hash_algorithm: 'SHA-256',
      });
    } catch {}
  }

  // ── H. Audit / comm log (best-effort) ────────────────────────────────────
  try { if (currentUser) await logSend({ estimate_id: estimate.id, estimate_number: estimate.estimate_number, user: currentUser, client_email: recipientEmail }).catch(() => {}); } catch {}
  try { await logComm({ event_type: 'estimate_sent', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: recipientEmail, estimate_id: estimate.id, appointment_id: estimate.appointment_id || '', subject, preview: `Total: $${(estimate.total || 0).toFixed(2)}` }); } catch {}
  try { await recordSuccessfulTransmission({ estimateId: estimate.id, snapshotId, recipientEmail, messageId: emailRes.data?.id, subject, clientName: estimate.client_name, estimateNumber: estimate.estimate_number, documentType: estimate.document_type }); } catch {}

  return {
    success: true,
    messageId: emailRes.data?.id,
    secureLink: finalLink,
    pdfUrl,
    pdfHash,
    signingPackageId: signingPackage.id,
    nexArtSignLinked: true,
  };
}


export async function logPricingOverride(estimate, lossValidation, recipientEmail) {
  const lossItems = Array.isArray(lossValidation?.lossItems) ? lossValidation.lossItems : [];
  if (lossItems.length === 0) return;
  const totalLoss = lossItems.reduce((sum, item) => sum + ((Number(item.loss_per_unit) || 0) * (Number(item.quantity) || 0)), 0);
  try {
    const currentUser = await base44.auth.me().catch(() => null);
    if (currentUser) await logBelowCostOverride({ estimate_id: estimate.id, estimate_number: estimate.estimate_number, user: currentUser, totalLoss, lossItemsCount: lossItems.length, metadata: { client_email: recipientEmail, client_name: estimate?.client_name || '' } }).catch(() => {});
  } catch {}
}

export async function logSendFailure(estimate, recipientEmail, subject, error) {
  try { await logCommFailed({ event_type: 'estimate_sent', client_name: estimate.client_name, client_email: recipientEmail, estimate_id: estimate.id, subject }).catch(() => {}); } catch {}
  try { await recordFailedTransmission({ estimateId: estimate.id, recipientEmail, errorMessage: error?.message || String(error), subject, clientName: estimate.client_name, estimateNumber: estimate.estimate_number, documentType: estimate.document_type }); } catch {}
}