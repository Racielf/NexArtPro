/**
 * estimateSendOrchestrator.js
 *
 * Encapsula la lógica pura de orquestación del envío de estimates.
 * Responsabilidades:
 *   1. Validación pre-envío (pricing, fields, attachments)
 *   2. Generación del token compartido
 *   3. Generación del PDF final usando las opciones visibles del documento
 *   4. Invocación de email con PDF y attachments seleccionados
 *   5. Persistencia de document_config
 *   6. Auditoría y logging
 *
 * Retorna estados intermedios para que EstimateSendReview maneje UI.
 */

import { base44 } from '@/api/base44Client';
import { generatePublicShareToken, markEstimateSent } from '@/lib/estimateSalesLifecycle';
import { validateEstimatePricing, checkAttachmentCompleteness } from '@/lib/pricingValidation';
import { validateDocTypeFields } from '@/lib/documentTypeConfig';
import { logComm, logCommFailed } from '@/lib/commTracking';
import { logSend, logBelowCostOverride } from '@/lib/estimateAuditLog';
import { generateEstimatePdfBase64 } from '@/lib/estimatePrint';
import { recordSuccessfulTransmission, recordFailedTransmission } from '@/lib/estimateTransmission';

/**
 * Validar estado pre-envío (pricing, fields, attachments).
 * Retorna { valid: boolean, warnings?: {...}, errors?: [...] }
 */
export async function validateBeforeSend(estimate, recipientEmail) {
  if (!recipientEmail) {
    return { valid: false, errors: ['Recipient email is required'] };
  }

  const dtv = validateDocTypeFields(estimate);
  if (!dtv.valid) {
    return { valid: false, errors: dtv.errors };
  }

  const pv = validateEstimatePricing(estimate);
  const ac = checkAttachmentCompleteness(estimate);

  return {
    valid: true,
    pricingWarning: pv,
    attachmentWarning: ac,
  };
}

function getSelectedClientAttachments(estimate, includedAttachmentIds = []) {
  const included = Array.isArray(includedAttachmentIds) ? includedAttachmentIds : [];
  const attachments = Array.isArray(estimate?.attachments) ? estimate.attachments : [];

  return attachments
    .filter(att => att?.intent === 'send_to_client')
    .filter(att => included.includes(att.id))
    .filter(att => att?.file_url)
    .map(att => ({
      filename: att.file_name || 'Attachment',
      url: att.file_url,
    }));
}

function base64ToPdfBlob(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

/**
 * Executa el envío después de todas las validaciones.
 * Maneja: token generation, PDF generation, email send, persistence, logging.
 */
export async function executeSend({
  estimate,
  recipientEmail,
  subject,
  message,
  currentTemplate,
  currentOptions,
  includedAttachmentIds = [],
  appConfig,
}) {
  if (!recipientEmail) {
    throw new Error('Recipient email is required');
  }

  // 1. Generate or wait for public share token
  let finalLink = `${window.location.origin}/client-estimate?token=generating`;
  try {
    const token = await generatePublicShareToken(estimate);
    finalLink = `${window.location.origin}/client-estimate?token=${token}`;
  } catch (err) {
    console.warn('[executeSend] token generation failed:', err?.message);
    throw new Error('Failed to generate secure share link');
  }

  // 2. Prepare document config for persistence
  const documentConfig = {
    template: currentTemplate,
    options: currentOptions,
  };

  // 3. Generate final PDF before email so the email body and attachments match the UI.
  let generatedPdf = null;
  try {
    generatedPdf = await generateEstimatePdfBase64(estimate, currentOptions, currentTemplate);
  } catch (err) {
    console.warn('[executeSend] PDF generation failed before email:', err?.message);
  }

  const emailAttachments = [];
  if (generatedPdf?.base64) {
    emailAttachments.push({
      filename: generatedPdf.filename || `Estimate-${estimate?.estimate_number || 'document'}.pdf`,
      content: generatedPdf.base64,
      contentType: 'application/pdf',
    });
  }

  emailAttachments.push(...getSelectedClientAttachments(estimate, includedAttachmentIds));

  // 4. Send email
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

  if (emailRes.data?.error) {
    throw new Error(emailRes.data.error);
  }

  // 5. Get current user for snapshot
  let currentUser = null;
  try {
    currentUser = await base44.auth.me().catch(() => null);
  } catch (err) {
    console.warn('[executeSend] auth fetch failed:', err?.message);
  }

  // 6. Persist send state (status + document_config + snapshot)
  let snapshotId = null;
  try {
    await markEstimateSent(estimate.id, { documentConfig, estimate, currentUser });
    const snapshots = await base44.asServiceRole.entities.EstimateSnapshot.filter(
      { estimate_id: estimate.id },
      '-created_date',
      1
    );
    if (snapshots && snapshots.length > 0) {
      snapshotId = snapshots[0].id;
    }
  } catch (err) {
    console.warn('[executeSend] markEstimateSent failed:', err?.message);
    // Don't throw — email was already sent
  }

  // 7. Store generated PDF on snapshot if available.
  let pdfUrl = null;
  let pdfFilename = generatedPdf?.filename || null;
  if (generatedPdf?.base64) {
    try {
      const pdfFile = base64ToPdfBlob(generatedPdf.base64);
      const uploadRes = await base44.integrations.Core.UploadFile({ file: pdfFile });
      pdfUrl = uploadRes?.file_url;
    } catch (err) {
      console.warn('[executeSend] PDF upload failed:', err?.message);
    }
  }

  if (pdfUrl && snapshotId) {
    try {
      await base44.asServiceRole.entities.EstimateSnapshot.update(snapshotId, {
        pdf_file_url: pdfUrl,
        pdf_file_name: pdfFilename || `estimate-${estimate.estimate_number}.pdf`,
      });
    } catch (err) {
      console.warn('[executeSend] snapshot PDF linkage failed:', err?.message);
    }
  }

  // 8. Log audit events
  try {
    if (currentUser) {
      await logSend({
        estimate_id: estimate.id,
        estimate_number: estimate.estimate_number,
        user: currentUser,
        client_email: recipientEmail,
      }).catch(err => console.warn('[audit] send log failed:', err?.message));
    }
  } catch (err) {
    console.warn('[executeSend] logging failed:', err?.message);
  }

  // 9. Log comm event
  try {
    await logComm({
      event_type: 'estimate_sent',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: recipientEmail,
      estimate_id: estimate.id,
      appointment_id: estimate.appointment_id || '',
      subject,
      preview: `Total: $${(estimate.total || 0).toFixed(2)}`,
    });
  } catch (err) {
    console.warn('[executeSend] comm log failed:', err?.message);
  }

  // 10. Record transmission on successful send
  try {
    await recordSuccessfulTransmission({
      estimateId: estimate.id,
      snapshotId,
      recipientEmail,
      messageId: emailRes.data?.id,
      subject,
      clientName: estimate.client_name,
      estimateNumber: estimate.estimate_number,
      documentType: estimate.document_type,
    });
  } catch (err) {
    console.warn('[executeSend] transmission recording failed:', err?.message);
  }

  return {
    success: true,
    messageId: emailRes.data?.id,
    secureLink: finalLink,
    pdfUrl,
  };
}

/**
 * Log pricing override (when proceeding with below-cost items).
 */
export async function logPricingOverride(estimate, lossValidation, recipientEmail) {
  const lossItems = Array.isArray(lossValidation?.lossItems) ? lossValidation.lossItems : [];
  if (lossItems.length === 0) return;

  const totalLoss = lossItems.reduce(
    (sum, item) => sum + ((Number(item.loss_per_unit) || 0) * (Number(item.quantity) || 0)),
    0
  );

  try {
    const currentUser = await base44.auth.me().catch(() => null);
    if (currentUser) {
      await logBelowCostOverride({
        estimate_id: estimate.id,
        estimate_number: estimate.estimate_number,
        user: currentUser,
        totalLoss,
        lossItemsCount: lossItems.length,
        metadata: {
          client_email: recipientEmail,
          client_name: estimate?.client_name || '',
        },
      }).catch(err => console.warn('[audit] below-cost override log failed:', err?.message));
    }
  } catch (err) {
    console.warn('[logPricingOverride] failed:', err?.message);
  }
}

/**
 * Log failed send attempt.
 */
export async function logSendFailure(estimate, recipientEmail, subject, error) {
  try {
    await logCommFailed({
      event_type: 'estimate_sent',
      client_name: estimate.client_name,
      client_email: recipientEmail,
      estimate_id: estimate.id,
      subject,
    }).catch(() => {});
  } catch (err) {
    console.warn('[logSendFailure] failed:', err?.message);
  }

  try {
    await recordFailedTransmission({
      estimateId: estimate.id,
      recipientEmail,
      errorMessage: error?.message || String(error),
      subject,
      clientName: estimate.client_name,
      estimateNumber: estimate.estimate_number,
      documentType: estimate.document_type,
    });
  } catch (err) {
    console.warn('[logSendFailure] transmission recording failed:', err?.message);
  }
}
