import { base44 } from '@/api/base44Client';

/**
 * Creates a pre-filled Estimate from a client/appointment context
 * and navigates to the editor.
 * @param {object} params
 * @param {object} [params.client]      - Client entity record
 * @param {object} [params.appointment] - Appointment entity record
 * @param {function} params.navigate    - react-router navigate fn
 */
export async function createEstimateFromContext({ client, appointment, navigate }) {
  const allEstimates = await base44.entities.Estimate.list('-created_date', 1);
  const lastNum = allEstimates.length > 0 ? (allEstimates[0].estimate_number || 0) : 0;
  const estimateNumber = lastNum + 1;

  // Build address from client
  const addressParts = [];
  if (client?.address) addressParts.push(client.address);
  if (client?.city) addressParts.push(client.city);
  if (client?.state) addressParts.push(client.state);
  if (client?.zip) addressParts.push(client.zip);
  const address = addressParts.join(', ') || appointment?.service_address || '';

  const payload = {
    estimate_number: estimateNumber,
    status: 'draft',
    client_id: client?.id || appointment?.customer_id || '',
    client_name: client?.full_name || appointment?.customer_display_name || '',
    client_email: client?.email || appointment?.customer_email || '',
    client_phone: client?.phone || appointment?.customer_phone || '',
    client_address: address,
    appointment_id: appointment?.id || '',
    title: appointment?.title || appointment?.service_type || '',
    groups: [],
    line_items: [],
    subtotal: 0,
    total: 0,
    tax_rate: 0,
    discount_value: 0,
  };

  const est = await base44.entities.Estimate.create(payload);

  // Link appointment back to estimate
  if (appointment?.id) {
    await base44.entities.Appointment.update(appointment.id, { estimate_id: est.id });
  }

  navigate(`/estimate-editor?id=${est.id}`);
}