/**
 * seedFromBrowser.js — Run in the browser console to seed demo data.
 * The nexartClient proxy bypasses RLS issues by using the anon key directly.
 * 
 * Usage: Copy-paste into browser console at http://localhost:5173/
 */

const CLIENTS = [
  { name: 'Sarah Mitchell', email: 'sarah.mitchell@gmail.com', phone: '(503) 555-0121', address: '2847 NE Glisan St, Portland, OR 97232' },
  { name: 'James Rodriguez', email: 'jrodriguez@outlook.com', phone: '(503) 555-0134', address: '1520 SW Morrison St, Portland, OR 97205' },
  { name: 'Pacific NW Realty', email: 'office@pnwrealty.com', phone: '(503) 555-0178', address: '4200 SE Division St, Portland, OR 97206' },
  { name: 'Linda Chen', email: 'lchen.homes@gmail.com', phone: '(503) 555-0192', address: '7834 N Interstate Ave, Portland, OR 97217' },
  { name: 'David Gutierrez', email: 'gutierrez@yahoo.com', phone: '(503) 555-0203', address: '3156 SE Hawthorne Blvd, Portland, OR 97214' },
  { name: 'Tom Baker', email: 'tbaker@comcast.net', phone: '(503) 555-0215', address: '9421 SW Barbur Blvd, Portland, OR 97219' },
  { name: 'Cascade PM', email: 'maint@cascadepm.com', phone: '(503) 555-0267', address: '6100 NE Sandy Blvd, Portland, OR 97213' },
  { name: 'Rebecca Washington', email: 'rwash@gmail.com', phone: '(503) 555-0289', address: '1823 NW 23rd Ave, Portland, OR 97210' },
];

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const today = new Date().toISOString().slice(0, 10);

// Use the app's Supabase client
const { supabase } = await import('/src/lib/supabaseClient.js');

async function seedAll() {
  console.log('🌱 Starting seed...');

  // ── Leads ──
  const leads = [
    { name: 'Michael Torres', email: 'mtorres@gmail.com', phone: '(971) 555-0301', source: 'Google', status: 'new', details: 'Wants bathroom remodel quote', created_date: daysAgo(3) },
    { name: 'Ashley Park', email: 'apark@yahoo.com', phone: '(503) 555-0312', source: 'Referral', status: 'contacted', details: 'Kitchen renovation, 1960s home', created_date: daysAgo(7) },
    { name: 'Robert Kim', email: 'rkim@outlook.com', phone: '(503) 555-0323', source: 'Yelp', status: 'new', details: 'Deck replacement - cedar', created_date: daysAgo(1) },
    { name: 'Jennifer Adams', email: 'jadams@gmail.com', phone: '(971) 555-0334', source: 'Website', status: 'qualified', details: 'Full home renovation, $50k budget', created_date: daysAgo(14) },
    { name: 'Carlos Mendez', email: 'cmendez@hot.com', phone: '(503) 555-0345', source: 'Nextdoor', status: 'new', details: 'Fence repair after storm', created_date: today },
  ];
  let r = await supabase.from('leads').insert(leads);
  console.log('Leads:', r.error?.message || '✅');

  // ── Estimates ──
  const C = CLIENTS;
  const estimates = [
    { estimate_number: 1001, document_type: 'ESTIMATE', client_name: C[0].name, client_email: C[0].email, client_phone: C[0].phone, client_address: C[0].address, title: 'Kitchen Remodel - Full Renovation', status: 'approved', total: 15500, subtotal: 14200, line_items: [{ service_name: 'Kitchen Remodel', quantity: 1, unit_price: 14200, line_total: 14200 }, { service_name: 'Permits & Materials', quantity: 1, unit_price: 1300, line_total: 1300 }], created_date: daysAgo(45), sent_at: daysAgo(44), signed_at: daysAgo(40) },
    { estimate_number: 1002, document_type: 'ESTIMATE', client_name: C[1].name, client_email: C[1].email, client_phone: C[1].phone, client_address: C[1].address, title: 'Bathroom Renovation - Master Bath', status: 'sent', total: 8200, subtotal: 8200, line_items: [{ service_name: 'Bathroom Renovation', quantity: 1, unit_price: 8200, line_total: 8200 }], created_date: daysAgo(10), sent_at: daysAgo(9) },
    { estimate_number: 1003, document_type: 'ESTIMATE', client_name: C[2].name, client_email: C[2].email, client_phone: C[2].phone, client_address: C[2].address, title: 'Property Maintenance - 3 Units', status: 'approved', total: 12600, subtotal: 12600, line_items: [{ service_name: 'Interior Painting', quantity: 3, unit_price: 3800, line_total: 11400 }, { service_name: 'Drywall Repair', quantity: 1, unit_price: 1200, line_total: 1200 }], created_date: daysAgo(30), sent_at: daysAgo(29), signed_at: daysAgo(25) },
    { estimate_number: 1004, document_type: 'ESTIMATE', client_name: C[3].name, client_email: C[3].email, client_phone: C[3].phone, client_address: C[3].address, title: 'Window Replacement - 6 Windows', status: 'draft', total: 7400, subtotal: 7400, line_items: [{ service_name: 'Window Replacement', quantity: 6, unit_price: 1233, line_total: 7400 }], created_date: daysAgo(2) },
    { estimate_number: 1005, document_type: 'ESTIMATE', client_name: C[4].name, client_email: C[4].email, client_phone: C[4].phone, client_address: C[4].address, title: 'Deck Construction - Composite', status: 'approved', total: 6800, subtotal: 6800, line_items: [{ service_name: 'Deck Construction', quantity: 1, unit_price: 6800, line_total: 6800 }], created_date: daysAgo(60), sent_at: daysAgo(58), signed_at: daysAgo(55) },
    { estimate_number: 1006, document_type: 'ESTIMATE', client_name: C[5].name, client_email: C[5].email, client_phone: C[5].phone, client_address: C[5].address, title: 'Roof Repair - Storm Damage', status: 'sent', total: 4500, subtotal: 4500, line_items: [{ service_name: 'Roof Repair', quantity: 1, unit_price: 4500, line_total: 4500 }], created_date: daysAgo(5), sent_at: daysAgo(4) },
    { estimate_number: 1007, document_type: 'ESTIMATE', client_name: C[6].name, client_email: C[6].email, client_phone: C[6].phone, client_address: C[6].address, title: 'Flooring Installation - 2 Apartments', status: 'signed', total: 11200, subtotal: 11200, line_items: [{ service_name: 'Flooring Installation', quantity: 2, unit_price: 5600, line_total: 11200 }], created_date: daysAgo(20), sent_at: daysAgo(19), signed_at: daysAgo(15) },
    { estimate_number: 1008, document_type: 'ESTIMATE', client_name: C[7].name, client_email: C[7].email, client_phone: C[7].phone, client_address: C[7].address, title: 'Fence Installation - Cedar', status: 'draft', total: 3200, subtotal: 3200, line_items: [{ service_name: 'Fence Installation', quantity: 1, unit_price: 3200, line_total: 3200 }], created_date: daysAgo(1) },
  ];
  r = await supabase.from('estimates').insert(estimates);
  console.log('Estimates:', r.error?.message || '✅');

  // ── Work Orders ──
  const workOrders = [
    { work_order_number: 2001, client_name: C[0].name, client_address: C[0].address, client_phone: C[0].phone, title: 'Kitchen Remodel - Full', status: 'in_progress', total: 15500, assigned_to: 'Carlos Rivera', scheduled_date: daysAgo(30), notes: 'Phase 2: cabinets and countertops', created_date: daysAgo(38) },
    { work_order_number: 2002, client_name: C[2].name, client_address: C[2].address, client_phone: C[2].phone, title: 'Interior Painting - Unit A', status: 'completed', total: 3800, assigned_to: 'Miguel Santos', scheduled_date: daysAgo(18), notes: 'Completed - 2 coats', created_date: daysAgo(22) },
    { work_order_number: 2003, client_name: C[2].name, client_address: C[2].address, client_phone: C[2].phone, title: 'Interior Painting - Unit B', status: 'completed', total: 3800, assigned_to: 'Miguel Santos', scheduled_date: daysAgo(14), notes: 'Completed ahead of schedule', created_date: daysAgo(22) },
    { work_order_number: 2004, client_name: C[2].name, client_address: C[2].address, client_phone: C[2].phone, title: 'Drywall + Paint - Unit C', status: 'in_progress', total: 5000, assigned_to: 'Miguel Santos', scheduled_date: daysAgo(2), notes: 'Drywall done, painting starts tomorrow', created_date: daysAgo(22) },
    { work_order_number: 2005, client_name: C[4].name, client_address: C[4].address, client_phone: C[4].phone, title: 'Deck Construction', status: 'completed', total: 6800, assigned_to: 'Carlos Rivera', scheduled_date: daysAgo(40), notes: 'Client very satisfied', created_date: daysAgo(50) },
    { work_order_number: 2006, client_name: C[6].name, client_address: C[6].address, client_phone: C[6].phone, title: 'Flooring - Apt 1', status: 'scheduled', total: 5600, assigned_to: 'Team B', scheduled_date: daysFromNow(3), notes: 'LVP flooring, 850 sqft', created_date: daysAgo(10) },
    { work_order_number: 2007, client_name: C[6].name, client_address: C[6].address, client_phone: C[6].phone, title: 'Flooring - Apt 2', status: 'draft', total: 5600, assigned_to: 'Team B', scheduled_date: daysFromNow(7), notes: 'Same spec as Apt 1', created_date: daysAgo(10) },
  ];
  r = await supabase.from('work_orders').insert(workOrders);
  console.log('Work Orders:', r.error?.message || '✅');

  // ── Invoices ──
  const invoices = [
    { invoice_number: 3001, client_name: C[4].name, client_email: C[4].email, client_address: C[4].address, title: 'Deck Construction - Final', status: 'paid', total: 6800, subtotal: 6800, amount_paid: 6800, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(35) + 'T10:00:00Z', due_date: daysAgo(30), line_items: [{ service_name: 'Deck Construction', quantity: 1, unit_price: 6800, line_total: 6800 }], created_date: daysAgo(40), sent_at: daysAgo(39) },
    { invoice_number: 3002, client_name: C[2].name, client_email: C[2].email, client_address: C[2].address, title: 'Interior Painting - Unit A', status: 'paid', total: 3800, subtotal: 3800, amount_paid: 3800, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(12) + 'T14:30:00Z', due_date: daysAgo(8), line_items: [{ service_name: 'Interior Painting', quantity: 1, unit_price: 3800, line_total: 3800 }], created_date: daysAgo(16), sent_at: daysAgo(15) },
    { invoice_number: 3003, client_name: C[2].name, client_email: C[2].email, client_address: C[2].address, title: 'Interior Painting - Unit B', status: 'paid', total: 3800, subtotal: 3800, amount_paid: 3800, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(5) + 'T09:15:00Z', due_date: daysAgo(4), line_items: [{ service_name: 'Interior Painting', quantity: 1, unit_price: 3800, line_total: 3800 }], created_date: daysAgo(12), sent_at: daysAgo(11) },
    { invoice_number: 3004, client_name: C[0].name, client_email: C[0].email, client_address: C[0].address, title: 'Kitchen Remodel - 50% Deposit', status: 'paid', total: 7750, subtotal: 7750, amount_paid: 7750, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(20) + 'T16:00:00Z', due_date: daysAgo(18), line_items: [{ service_name: 'Kitchen Remodel (50%)', quantity: 1, unit_price: 7750, line_total: 7750 }], created_date: daysAgo(25), sent_at: daysAgo(24) },
    { invoice_number: 3005, client_name: C[0].name, client_email: C[0].email, client_address: C[0].address, title: 'Kitchen Remodel - Balance', status: 'sent', total: 7750, subtotal: 7750, amount_paid: 0, balance_due: 7750, payment_status: 'unpaid', due_date: daysFromNow(5), line_items: [{ service_name: 'Kitchen Remodel (final)', quantity: 1, unit_price: 7750, line_total: 7750 }], created_date: daysAgo(3), sent_at: daysAgo(2) },
    { invoice_number: 3006, client_name: C[2].name, client_email: C[2].email, client_address: C[2].address, title: 'Drywall + Painting Unit C', status: 'overdue', total: 5000, subtotal: 5000, amount_paid: 0, balance_due: 5000, payment_status: 'unpaid', due_date: daysAgo(2), line_items: [{ service_name: 'Drywall + Painting', quantity: 1, unit_price: 5000, line_total: 5000 }], created_date: daysAgo(8), sent_at: daysAgo(7) },
  ];
  r = await supabase.from('invoices').insert(invoices);
  console.log('Invoices:', r.error?.message || '✅');

  // ── Appointments ──
  const appointments = [
    { customer_display_name: C[1].name, customer_phone: C[1].phone, appointment_date: today, start_time: '10:00', service_type: 'estimate_visit', notes: 'Master bath remodel assessment', status: 'confirmed', service_address: C[1].address, created_date: daysAgo(3) },
    { customer_display_name: C[3].name, customer_phone: C[3].phone, appointment_date: today, start_time: '14:00', service_type: 'estimate_visit', notes: 'Window replacement measurement', status: 'confirmed', service_address: C[3].address, created_date: daysAgo(2) },
    { customer_display_name: 'Carlos Mendez', customer_phone: '(503) 555-0345', appointment_date: daysFromNow(1), start_time: '09:00', service_type: 'inspection', notes: 'Fence damage inspection', status: 'new', service_address: '1456 SE Foster Rd, Portland, OR', created_date: today },
    { customer_display_name: C[7].name, customer_phone: C[7].phone, appointment_date: daysFromNow(2), start_time: '11:00', service_type: 'estimate_visit', notes: 'Cedar fence - backyard', status: 'new', service_address: C[7].address, created_date: daysAgo(1) },
  ];
  r = await supabase.from('appointments').insert(appointments);
  console.log('Appointments:', r.error?.message || '✅');

  // ── Proposals ──
  const proposals = [
    { proposal_number: 4001, client_name: C[3].name, client_email: C[3].email, title: 'Whole-House Window Upgrade', status: 'draft', total_amount: 18500, items: [{ service_name: 'Window Replacement', quantity: 12, unit_price: 1233, line_total: 14800 }, { service_name: 'Trim Work', quantity: 1, unit_price: 3700, line_total: 3700 }], created_date: daysAgo(2) },
  ];
  r = await supabase.from('proposals').insert(proposals);
  console.log('Proposals:', r.error?.message || '✅');

  console.log('\n🎉 Done! Refresh the page to see data.');
}

seedAll();
