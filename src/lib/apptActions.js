/**
 * Appointment lifecycle actions — OMW, Arrived, Finish Visit
 * Centralizes status changes, time tracking log creation, and customer notifications.
 */

import { base44 } from '@/api/base44Client';
import { logComm, logCommFailed } from '@/lib/commTracking';

// ─── helpers ─────────────────────────────────────────────────────────────────

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

// ─── SEND CONFIRMATION ────────────────────────────────────────────────────────

export async function sendAppointmentConfirmation(appt) {
  if (!appt.customer_email) return;
  const dateStr = appt.appointment_date || '';
  const timeStr = appt.start_time ? ` at ${appt.start_time}` : '';
  const address = appt.service_address ? `\nLocation: ${appt.service_address}` : '';
  const window = appt.arrival_window ? `\nArrival window: ${appt.arrival_window}` : '';

  const body =
    `Hi ${appt.customer_display_name},\n\n` +
    `Your appointment has been confirmed!\n` +
    `Date: ${dateStr}${timeStr}${address}${window}\n\n` +
    `We'll be in touch if anything changes. See you then!\n\n` +
    `Thank you for choosing us.`;

  try {
    await base44.integrations.Core.SendEmail({
      to: appt.customer_email,
      subject: `Appointment Confirmed – ${dateStr}`,
      body,
    });
    await logComm({
      event_type: 'appointment_created',
      client_id: appt.customer_id || '',
      client_name: appt.customer_display_name,
      client_email: appt.customer_email,
      appointment_id: appt.id,
      subject: `Appointment Confirmed – ${dateStr}`,
      preview: `${dateStr}${timeStr}`,
    });
  } catch {
    await logCommFailed({
      event_type: 'appointment_created',
      client_name: appt.customer_display_name,
      client_email: appt.customer_email,
      appointment_id: appt.id,
      subject: `Appointment Confirmed – ${dateStr}`,
    });
  }
}

// ─── OMW ─────────────────────────────────────────────────────────────────────

export async function actionOMW(appt) {
  const now = new Date().toISOString();
  const pos = await getPosition();

  // Update appointment
  await base44.entities.Appointment.update(appt.id, {
    status: 'on_the_way',
    omw_started_at: now,
  });

  // Create travel log
  const log = await base44.entities.TimeTrackingLog.create({
    appointment_id: appt.id,
    customer_id: appt.customer_id || '',
    customer_name: appt.customer_display_name,
    worker_name: appt.assigned_worker_name || '',
    tracking_type: 'travel',
    start_time: now,
    start_location: appt.service_address || '',
    start_lat: pos?.lat || null,
    start_lng: pos?.lng || null,
    status: 'active',
    notes: `Travel to ${appt.customer_display_name}`,
  });

  // Notify customer
  if (appt.customer_email) {
    const eta = appt.arrival_window || appt.start_time || 'soon';
    const body =
      `Hi ${appt.customer_display_name},\n\n` +
      `Great news — your technician is on the way!\n` +
      `Expected arrival: ${eta}\n` +
      (appt.assigned_worker_name ? `Technician: ${appt.assigned_worker_name}\n` : '') +
      `\nPlease make sure someone is available at the address on file.\n\nThank you!`;
    try {
      await base44.integrations.Core.SendEmail({
        to: appt.customer_email,
        subject: `We're on our way!`,
        body,
      });
      await logComm({
        event_type: 'omw',
        client_id: appt.customer_id || '',
        client_name: appt.customer_display_name,
        client_email: appt.customer_email,
        appointment_id: appt.id,
        subject: `We're on our way!`,
        preview: `ETA: ${eta}`,
      });
    } catch {
      await logCommFailed({
        event_type: 'omw',
        client_name: appt.customer_display_name,
        client_email: appt.customer_email,
        appointment_id: appt.id,
        subject: `We're on our way!`,
      });
    }
  }

  return log;
}

// ─── ARRIVED ─────────────────────────────────────────────────────────────────

export async function actionArrived(appt) {
  const now = new Date().toISOString();
  const pos = await getPosition();

  // Update appointment
  await base44.entities.Appointment.update(appt.id, {
    status: 'arrived',
    arrived_at: now,
  });

  // Close active travel log for this appointment
  const activeLogs = await base44.entities.TimeTrackingLog.filter({
    appointment_id: appt.id,
    tracking_type: 'travel',
    status: 'active',
  });

  for (const log of activeLogs) {
    const startPos = { lat: log.start_lat, lng: log.start_lng };
    let miles = 0;
    if (startPos.lat && startPos.lng && pos?.lat && pos?.lng) {
      miles = parseFloat(haversineMiles(startPos.lat, startPos.lng, pos.lat, pos.lng).toFixed(2));
    }
    const durationMin = Math.round((new Date(now) - new Date(log.start_time)) / 60000);
    await base44.entities.TimeTrackingLog.update(log.id, {
      end_time: now,
      end_location: appt.service_address || '',
      end_lat: pos?.lat || null,
      end_lng: pos?.lng || null,
      miles_traveled: miles,
      duration_minutes: durationMin,
      status: 'completed',
    });
  }

  // Start on-site log
  await base44.entities.TimeTrackingLog.create({
    appointment_id: appt.id,
    customer_id: appt.customer_id || '',
    customer_name: appt.customer_display_name,
    worker_name: appt.assigned_worker_name || '',
    tracking_type: 'on_site',
    start_time: now,
    start_location: appt.service_address || '',
    start_lat: pos?.lat || null,
    start_lng: pos?.lng || null,
    status: 'active',
    notes: `On site at ${appt.customer_display_name}`,
  });
}

// ─── FINISH VISIT ─────────────────────────────────────────────────────────────

export async function actionFinishVisit(appt, visitNotes = '') {
  const now = new Date().toISOString();
  const pos = await getPosition();

  // Update appointment
  const notesUpdate = visitNotes
    ? appt.notes
      ? appt.notes + '\n\n' + visitNotes
      : visitNotes
    : appt.notes;

  await base44.entities.Appointment.update(appt.id, {
    status: 'visit_completed',
    completed_at: now,
    notes: notesUpdate,
  });

  // Close any active on-site logs
  const activeLogs = await base44.entities.TimeTrackingLog.filter({
    appointment_id: appt.id,
    status: 'active',
  });
  for (const log of activeLogs) {
    const durationMin = Math.round((new Date(now) - new Date(log.start_time)) / 60000);
    await base44.entities.TimeTrackingLog.update(log.id, {
      end_time: now,
      end_location: appt.service_address || '',
      end_lat: pos?.lat || null,
      end_lng: pos?.lng || null,
      duration_minutes: durationMin,
      status: 'completed',
    });
  }

  // Send follow-up email
  if (appt.customer_email) {
    const body =
      `Hi ${appt.customer_display_name},\n\n` +
      `Thank you for having us out today! We now have all the information we need to prepare your estimate.\n\n` +
      `We'll have it ready for you shortly. In the meantime, if you have any additional details, questions, or changes you'd like to discuss — don't hesitate to call or text us.\n\n` +
      `We look forward to working with you!\n\n` +
      (visitNotes ? `Visit notes: ${visitNotes}\n\n` : '') +
      `Thank you,\nThe Team`;
    try {
      await base44.integrations.Core.SendEmail({
        to: appt.customer_email,
        subject: `Visit Complete – Your Estimate is on the Way`,
        body,
      });
      await logComm({
        event_type: 'appointment_created',
        client_id: appt.customer_id || '',
        client_name: appt.customer_display_name,
        client_email: appt.customer_email,
        appointment_id: appt.id,
        subject: `Visit Complete – Your Estimate is on the Way`,
        preview: `Thank you for having us out today!`,
      });
    } catch {
      await logCommFailed({
        event_type: 'appointment_created',
        client_name: appt.customer_display_name,
        client_email: appt.customer_email,
        appointment_id: appt.id,
        subject: `Visit Complete – Your Estimate is on the Way`,
      });
    }
  }
}