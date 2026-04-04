/**
 * Scheduled function: sends 24h-before appointment reminders.
 * Run daily (e.g. every morning at 8am).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get all appointments scheduled for tomorrow that haven't been reminded
    const appts = await base44.asServiceRole.entities.Appointment.filter({
      appointment_date: tomorrowStr,
    });

    const eligible = appts.filter(a =>
      !['cancelled', 'no_show', 'visit_completed'].includes(a.status) &&
      a.customer_email &&
      !a.reminder_sent_at
    );

    let sent = 0;
    const errors = [];

    for (const appt of eligible) {
      try {
        const timeStr = appt.start_time ? ` at ${appt.start_time}` : '';
        const window = appt.arrival_window ? `\nArrival window: ${appt.arrival_window}` : '';
        const address = appt.service_address ? `\nLocation: ${appt.service_address}` : '';
        const worker = appt.assigned_worker_name ? `\nTechnician: ${appt.assigned_worker_name}` : '';

        const body =
          `Hi ${appt.customer_display_name},\n\n` +
          `This is a friendly reminder that your appointment is scheduled for tomorrow!\n\n` +
          `📅 Date: ${tomorrowStr}${timeStr}${window}${address}${worker}\n\n` +
          `Please make sure someone is available at the address on file.\n` +
          `If you need to reschedule, please contact us as soon as possible.\n\n` +
          `We look forward to seeing you!\n\nThank you.`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: appt.customer_email,
          subject: `Appointment Reminder – Tomorrow ${tomorrowStr}`,
          body,
        });

        // Mark reminder sent
        await base44.asServiceRole.entities.Appointment.update(appt.id, {
          reminder_sent_at: new Date().toISOString(),
        });

        // Log comm event
        await base44.asServiceRole.entities.CommEvent.create({
          event_type: 'appointment_reminder',
          channel: 'email',
          status: 'sent',
          client_id: appt.customer_id || '',
          client_name: appt.customer_display_name,
          client_email: appt.customer_email,
          appointment_id: appt.id,
          subject: `Appointment Reminder – Tomorrow ${tomorrowStr}`,
          preview: `Reminder for ${tomorrowStr}${timeStr}`,
        });

        sent++;
      } catch (e) {
        errors.push({ appt_id: appt.id, error: e.message });
      }
    }

    return Response.json({
      success: true,
      date: tomorrowStr,
      eligible: eligible.length,
      sent,
      errors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});