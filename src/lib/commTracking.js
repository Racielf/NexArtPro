import { nexartClient } from '@/api/nexartClient';

/**
 * Log a communication event.
 * Since we use nexartClient's built-in SendEmail and don't have delivery webhooks,
 * we record "sent" immediately on success and "failed" on error.
 * Email: sent → (delivered, opened, clicked) are future webhook-upgradeable states.
 * SMS: sent → delivered only (no open/click tracking).
 */
export async function logComm({
  event_type,
  channel = 'email',
  client_id = '',
  client_name,
  client_email = '',
  appointment_id = '',
  estimate_id = '',
  subject = '',
  preview = '',
  status = 'sent',
}) {
  try {
    await nexartClient.entities.CommEvent.create({
      event_type,
      channel,
      status,
      client_id,
      client_name,
      client_email,
      appointment_id,
      estimate_id,
      subject,
      preview,
    });
  } catch (e) {
    // Non-blocking — never break the main flow
    console.warn('logComm failed:', e);
  }
}

export async function logCommFailed({ event_type, channel = 'email', client_name, client_email = '', appointment_id = '', estimate_id = '', subject = '' }) {
  return logComm({ event_type, channel, client_name, client_email, appointment_id, estimate_id, subject, status: 'failed' });
}