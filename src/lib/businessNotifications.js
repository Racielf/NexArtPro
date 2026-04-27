/**
 * businessNotifications.js
 * Sends real email notifications to the business owner/admin
 * when clients interact with estimates (view, approve, sign, decline, request changes).
 *
 * Uses base44.integrations.Core.SendEmail.
 * Does NOT replace logComm — runs in parallel.
 */
import { base44 } from '@/api/base44Client';
import { APP_CONFIG } from '@/lib/appConfig';

const BUSINESS_EMAIL = APP_CONFIG.company.email;
const APP_NAME = APP_CONFIG.appName;
const COMPANY = APP_CONFIG.company.name;

function estimateLink(estimateId) {
  return `${window.location.origin}/estimate-editor?id=${estimateId}`;
}

function clientLink(estimate) {
  if (estimate?.public_share_token) {
    return `${window.location.origin}/client-estimate?token=${estimate.public_share_token}`;
  }
  return estimate?.id ? estimateLink(estimate.id) : '';
}

function timestamp() {
  return new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Notify business that a client viewed the estimate.
 */
export async function notifyEstimateViewed(estimate) {
  const num = estimate.estimate_number;
  const subject = `Estimate #${num} Viewed by Client`;
  const body = [
    `Hi ${COMPANY} team,`,
    '',
    `Your client ${estimate.client_name} just viewed Estimate #${num}.`,
    '',
    `Time: ${timestamp()}`,
    `Client: ${estimate.client_name}`,
    estimate.client_email ? `Email: ${estimate.client_email}` : '',
    `Total: $${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    '',
    `View estimate: ${estimateLink(estimate.id)}`,
    '',
    `- ${APP_NAME}`,
  ].filter(Boolean).join('\n');

  return base44.integrations.Core.SendEmail({
    to: BUSINESS_EMAIL,
    subject,
    body,
    from_name: APP_NAME,
  });
}

/**
 * Notify business that a client approved (without signature).
 */
export async function notifyEstimateApproved(estimate) {
  const num = estimate.estimate_number;
  const subject = `Estimate #${num} Approved by ${estimate.client_name}`;
  const body = [
    `Hi ${COMPANY} team,`,
    '',
    `Great news! ${estimate.client_name} approved Estimate #${num}.`,
    '',
    `Time: ${timestamp()}`,
    `Client: ${estimate.client_name}`,
    estimate.client_email ? `Email: ${estimate.client_email}` : '',
    `Total: $${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    '',
    `This approval was without a signature. You may want to follow up to collect a signed copy.`,
    '',
    `View estimate: ${estimateLink(estimate.id)}`,
    '',
    `- ${APP_NAME}`,
  ].filter(Boolean).join('\n');

  return base44.integrations.Core.SendEmail({
    to: BUSINESS_EMAIL,
    subject,
    body,
    from_name: APP_NAME,
  });
}

/**
 * Notify business that a client signed the estimate.
 * Includes a link to the signed document.
 */
export async function notifyEstimateSigned(estimate, { signerName, signerEmail }) {
  const num = estimate.estimate_number;
  const signedAt = timestamp();
  const subject = `Estimate #${num} Signed by ${signerName}`;
  const signedDocLink = clientLink(estimate);
  const body = [
    `Hi ${COMPANY} team,`,
    '',
    `Estimate #${num} has been officially signed and accepted.`,
    '',
    `SIGNATURE CONFIRMATION`,
    `Signer: ${signerName}`,
    signerEmail ? `Signer Email: ${signerEmail}` : '',
    `Signed At: ${signedAt}`,
    `Client: ${estimate.client_name}`,
    `Total: $${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    '',
    signedDocLink ? `View signed document: ${signedDocLink}` : '',
    estimate.final_signed_pdf_url ? `Signed PDF: ${estimate.final_signed_pdf_url}` : '',
    '',
    `View in dashboard: ${estimateLink(estimate.id)}`,
    '',
    `- ${APP_NAME}`,
  ].filter(Boolean).join('\n');

  return base44.integrations.Core.SendEmail({
    to: BUSINESS_EMAIL,
    subject,
    body,
    from_name: APP_NAME,
  });
}

/**
 * Notify business that a client declined the estimate.
 */
export async function notifyEstimateDeclined(estimate) {
  const num = estimate.estimate_number;
  const subject = `Estimate #${num} Declined by ${estimate.client_name}`;
  const body = [
    `Hi ${COMPANY} team,`,
    '',
    `Unfortunately, ${estimate.client_name} has declined Estimate #${num}.`,
    '',
    `Time: ${timestamp()}`,
    `Client: ${estimate.client_name}`,
    estimate.client_email ? `Email: ${estimate.client_email}` : '',
    `Total: $${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    '',
    `You may want to follow up with the client to discuss alternatives.`,
    '',
    `View estimate: ${estimateLink(estimate.id)}`,
    '',
    `- ${APP_NAME}`,
  ].filter(Boolean).join('\n');

  return base44.integrations.Core.SendEmail({
    to: BUSINESS_EMAIL,
    subject,
    body,
    from_name: APP_NAME,
  });
}

/**
 * Notify business that a client requested changes.
 */
export async function notifyEstimateChangesRequested(estimate, note) {
  const num = estimate.estimate_number;
  const subject = `Changes Requested for Estimate #${num}`;
  const body = [
    `Hi ${COMPANY} team,`,
    '',
    `${estimate.client_name} has requested changes to Estimate #${num}.`,
    '',
    `Time: ${timestamp()}`,
    `Client: ${estimate.client_name}`,
    estimate.client_email ? `Email: ${estimate.client_email}` : '',
    '',
    `CLIENT NOTE`,
    note || '(No details provided)',
    '',
    `Please review and send a revised estimate.`,
    '',
    `View estimate: ${estimateLink(estimate.id)}`,
    '',
    `- ${APP_NAME}`,
  ].filter(Boolean).join('\n');

  return base44.integrations.Core.SendEmail({
    to: BUSINESS_EMAIL,
    subject,
    body,
    from_name: APP_NAME,
  });
}
