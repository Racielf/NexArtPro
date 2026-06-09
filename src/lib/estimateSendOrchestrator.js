import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { markEstimateSent, generatePublicShareToken } from '@/lib/estimateSalesLifecycle';
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
  if (typeof window !== 'undefined' && window.location.pathname.includes('/send-estimate')) {
    window.location.href = `/estimates/edit?id=${estimate?.id}`;
    return { valid: false, errors: ['Redirecting from deprecated route...'] };
  }
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
  if (typeof window !== 'undefined' && window.location.pathname.includes('/send-estimate')) {
    window.location.href = `/estimates/edit?id=${estimate?.id}`;
    throw new Error('This legacy route is deprecated. Redirecting...');
  }
  if (!recipientEmail) throw new Error('Recipient email is required');

  const documentConfig = { template: currentTemplate, options: currentOptions, included_attachment_ids: Array.isArray(includedAttachmentIds) ? includedAttachmentIds : [] };
  const ts = new Date().toISOString();
  let generatedPdf = null;
  let pdfUrl = null;
  let pdfFilename = null;
  let pdfHash = '';

  try {
    generatedPdf = await generateEstimatePdfBase64(estimate, currentOptions, currentTemplate);
    pdfFilename = generatedPdf?.filename || null;
    if (generatedPdf?.base64) pdfHash = await sha256HexFromBase64(generatedPdf.base64);
  } catch (err) {
    console.warn('[executeSend] PDF generation/hash failed:', err?.message);
  }

  if (generatedPdf?.base64) {
    try {
      // Upload to Supabase Storage instead of legacy Base44 integrations
      const blob = base64ToPdfBlob(generatedPdf.base64);
      const filename = `estimates/${estimate.id || Date.now()}/${pdfFilename || 'estimate.pdf'}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filename, blob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        console.warn('[executeSend] Supabase Storage upload failed:', uploadError?.message);
      } else {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
        pdfUrl = urlData?.publicUrl || null;
      }
    } catch (err) {
      console.warn('[executeSend] PDF upload failed:', err?.message);
    }
  }

  let currentUser = null;
  try { currentUser = await base44.auth.me().catch(() => null); } catch {}
  currentUser = resolveAuthorizedSender(currentUser);

  let signingPackage = null;
  let finalLink = '';
  try {
    signingPackage = await createSigningPackageForEstimate({
      estimate,
      pdfUrl: pdfUrl || '',
      pdfName: pdfFilename || `Estimate-${estimate?.estimate_number || 'document'}.pdf`,
      pdfHash,
      currentUser,
    });
  } catch (err) {
    console.warn('[executeSend] NexArtSign signing link generation failed:', err?.message);
  }

  // Determine email link contract: client-portal view by default (with public token)
  const directSigning = currentOptions?.directSigning === true || estimate?.document_config?.options?.directSigning === true;
  if (directSigning && signingPackage?.signing_url) {
    finalLink = signingPackage.signing_url;
  } else {
    const token = estimate.public_share_token || await generatePublicShareToken(estimate);
    finalLink = `${window.location.origin}/client-estimate?token=${encodeURIComponent(token)}`;
  }

  if (!generatedPdf?.base64) {
    throw new Error('PDF generation failed. Cannot send estimate.');
  }

  const emailAttachments = [];
  emailAttachments.push({ filename: generatedPdf.filename || `Estimate-${estimate?.estimate_number || 'document'}.pdf`, content: generatedPdf.base64, contentType: 'application/pdf' });
  emailAttachments.push(...getSelectedClientAttachments(estimate, includedAttachmentIds));

  // Warn if signing link is missing but don't block the send
  if (!finalLink || !finalLink.includes('/sign-document?token=')) {
    console.warn('[executeSend] NexArtSign link missing — email will be sent without signing link');
  }

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

  let snapshotId = null;
  try {
    await markEstimateSent(estimate.id, { documentConfig, estimate, currentUser });
    await base44.entities.Estimate.update(estimate.id, {
      signing_package_id: signingPackage?.id || estimate.signing_package_id || '',
      signature_status: signingPackage?.id ? 'sent' : (estimate.signature_status || ''),
      document_hash: pdfHash || estimate.document_hash || '',
      document_hash_algorithm: pdfHash ? 'SHA-256' : estimate.document_hash_algorithm,
      company_signature_name: currentUser.full_name || estimate.company_signature_name || '',
      company_signature_email: currentUser.email || estimate.company_signature_email || '',
      company_signature_role: currentUser.role || estimate.company_signature_role || '',
      company_signed_at: estimate.company_signed_at || ts,
    }).catch(() => {});
    // Fetch latest snapshot using standard entity (RLS handles access)
    const snapshots = await base44.entities.EstimateSnapshot.filter({ estimate_id: estimate.id }, '-created_date', 1).catch(() => []);
    if (snapshots?.length) snapshotId = snapshots[0].id;
  } catch (err) {
    console.warn('[executeSend] post-send persistence failed:', err?.message);
  }

  if (pdfUrl && snapshotId) {
    try {
      await base44.entities.EstimateSnapshot.update(snapshotId, { pdf_file_url: pdfUrl, pdf_file_name: pdfFilename || `estimate-${estimate.estimate_number}.pdf`, pdf_file_hash: pdfHash || '', hash_algorithm: pdfHash ? 'SHA-256' : '' });
    } catch {}
  }

  try { if (currentUser) await logSend({ estimate_id: estimate.id, estimate_number: estimate.estimate_number, user: currentUser, client_email: recipientEmail }).catch(() => {}); } catch {}
  try { await logComm({ event_type: 'estimate_sent', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: recipientEmail, estimate_id: estimate.id, appointment_id: estimate.appointment_id || '', subject, preview: `Total: $${(estimate.total || 0).toFixed(2)}` }); } catch {}
  try { await recordSuccessfulTransmission({ estimateId: estimate.id, snapshotId, recipientEmail, messageId: emailRes.data?.id, subject, clientName: estimate.client_name, estimateNumber: estimate.estimate_number, documentType: estimate.document_type }); } catch {}

  return { success: true, messageId: emailRes.data?.id, secureLink: finalLink, pdfUrl, pdfHash, signingPackageId: signingPackage?.id || null, nexArtSignLinked: Boolean(signingPackage?.id) };
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