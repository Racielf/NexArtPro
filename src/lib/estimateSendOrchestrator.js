/**
 * estimateSendOrchestrator.js
 *
 * Encapsula la lógica pura de orquestación del envío de estimates.
 * Responsabilidades:
 *   1. Validación pre-envío (pricing, fields, attachments)
 *   2. Generación del token compartido
 *   3. Invocación de email
 *   4. Persistencia de document_config
 *   5. Auditoría y logging
 *
 * Retorna estados intermedios para que EstimateSendReview maneje UI.
 */

import { base44 } from '@/api/base44Client';
import { generatePublicShareToken, markEstimateSent } from '@/lib/estimateSalesLifecycle';
import { validateEstimatePricing, checkAttachmentCompleteness } from '@/lib/pricingValidation';
import { validateDocTypeFields, getDocTypeConfig } from '@/lib/documentTypeConfig';
import { logComm, logCommFailed } from '@/lib/commTracking';
import { logSend, logBelowCostOverride } from '@/lib/estimateAuditLog';

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

/**
 * Executa el envío después de todas las validaciones.
 * Maneja: token generation, email send, persistence, logging.
 */
export async function executeSend({
  estimate,
  recipientEmail,
  subject,
  message,
  currentTemplate,
  currentOptions,
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

  // 3. Send email
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
    });
  } catch (err) {
    throw new Error(`Email service error: ${err?.message}`);
  }

  if (emailRes.data?.error) {
    throw new Error(emailRes.data.error);
  }

  // 4. Persist send state (status + document_config)
  try {
    await markEstimateSent(estimate.id, { documentConfig, estimate });
  } catch (err) {
    console.warn('[executeSend] markEstimateSent failed:', err?.message);
    // Don't throw — email was already sent
  }

  // 5. Log audit events
  try {
    const currentUser = await base44.auth.me().catch(() => null);
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

  // 6. Log comm event
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

  return {
    success: true,
    messageId: emailRes.data?.id,
    secureLink: finalLink,
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
}