/**
 * seedData.js — Inserts realistic construction business demo data into Supabase.
 * Run via: node src/scripts/seedData.js
 * 
 * Creates: Customers, Estimates, Work Orders, Invoices, Appointments, Leads
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdiejuqbhqhebrpneymo.supabase.co';
const supabaseAnonKey = 'sb_publishable_TNoF7weSWe-OarIQ3zB4CA_z0Si5gup';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const now = new Date();
const today = now.toISOString().slice(0, 10);
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

function daysAgo(n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Realistic Portland-area construction clients ──
const CLIENTS = [
  { name: 'Sarah Mitchell', email: 'sarah.mitchell@gmail.com', phone: '(503) 555-0121', address: '2847 NE Glisan St, Portland, OR 97232' },
  { name: 'James Rodriguez', email: 'jrodriguez@outlook.com', phone: '(503) 555-0134', address: '1520 SW Morrison St, Portland, OR 97205' },
  { name: 'Pacific Northwest Realty', email: 'office@pnwrealty.com', phone: '(503) 555-0178', address: '4200 SE Division St, Portland, OR 97206' },
  { name: 'Linda Chen', email: 'lchen.homes@gmail.com', phone: '(503) 555-0192', address: '7834 N Interstate Ave, Portland, OR 97217' },
  { name: 'David & Maria Gutierrez', email: 'gutierrez.family@yahoo.com', phone: '(503) 555-0203', address: '3156 SE Hawthorne Blvd, Portland, OR 97214' },
  { name: 'Tom Baker', email: 'tbaker@comcast.net', phone: '(503) 555-0215', address: '9421 SW Barbur Blvd, Portland, OR 97219' },
  { name: 'Cascade Property Management', email: 'maintenance@cascadepm.com', phone: '(503) 555-0267', address: '6100 NE Sandy Blvd, Portland, OR 97213' },
  { name: 'Rebecca Washington', email: 'rwashington@gmail.com', phone: '(503) 555-0289', address: '1823 NW 23rd Ave, Portland, OR 97210' },
];

const SERVICES = [
  { name: 'Kitchen Remodel', price: 15500 },
  { name: 'Bathroom Renovation', price: 8200 },
  { name: 'Deck Construction', price: 6800 },
  { name: 'Roof Repair', price: 4500 },
  { name: 'Interior Painting (full house)', price: 3800 },
  { name: 'Drywall Repair & Patching', price: 1200 },
  { name: 'Flooring Installation', price: 5600 },
  { name: 'Fence Installation', price: 3200 },
  { name: 'Window Replacement (6 windows)', price: 7400 },
  { name: 'Siding Repair', price: 4100 },
];

async function seed() {
  console.log('🌱 Starting NexArtPro data seed...\n');

  // ── 1. Customers ──
  console.log('📇 Inserting customers...');
  const customers = CLIENTS.map((c, i) => ({
    client_name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    status: 'active',
    source: i < 3 ? 'referral' : i < 6 ? 'website' : 'repeat',
    created_date: daysAgo(90 - i * 10),
  }));
  const { error: custErr } = await supabase.from('customers').upsert(customers, { onConflict: 'email' });
  if (custErr) console.warn('  ⚠ customers:', custErr.message);
  else console.log(`  ✅ ${customers.length} customers inserted`);

  // ── 2. Leads ──
  console.log('🎯 Inserting leads...');
  const leads = [
    { full_name: 'Michael Torres', email: 'mtorres@gmail.com', phone: '(971) 555-0301', source: 'Google', status: 'new', notes: 'Wants bathroom remodel quote', created_date: daysAgo(3) },
    { full_name: 'Ashley Park', email: 'apark@yahoo.com', phone: '(503) 555-0312', source: 'Referral', status: 'contacted', notes: 'Kitchen renovation, 1960s home', created_date: daysAgo(7) },
    { full_name: 'Robert Kim', email: 'rkim@outlook.com', phone: '(503) 555-0323', source: 'Yelp', status: 'new', notes: 'Deck replacement - cedar', created_date: daysAgo(1) },
    { full_name: 'Jennifer Adams', email: 'jadams@gmail.com', phone: '(971) 555-0334', source: 'Website', status: 'qualified', notes: 'Full home renovation, $50k budget', created_date: daysAgo(14) },
    { full_name: 'Carlos Mendez', email: 'cmendez@hotmail.com', phone: '(503) 555-0345', source: 'Nextdoor', status: 'new', notes: 'Fence repair after storm', created_date: today },
  ];
  const { error: leadErr } = await supabase.from('leads').insert(leads);
  if (leadErr) console.warn('  ⚠ leads:', leadErr.message);
  else console.log(`  ✅ ${leads.length} leads inserted`);

  // ── 3. Estimates ──
  console.log('📄 Inserting estimates...');
  const estimates = [
    { estimate_number: 1001, document_type: 'ESTIMATE', client_name: CLIENTS[0].name, client_email: CLIENTS[0].email, client_phone: CLIENTS[0].phone, client_address: CLIENTS[0].address, title: 'Kitchen Remodel - Full Renovation', status: 'approved', total: 15500, subtotal: 14200, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Kitchen Remodel', quantity: 1, unit_price: 14200, line_total: 14200 }, { service_name: 'Permits & Materials', quantity: 1, unit_price: 1300, line_total: 1300 }]), created_date: daysAgo(45), sent_at: daysAgo(44), signed_at: daysAgo(40) },
    { estimate_number: 1002, document_type: 'ESTIMATE', client_name: CLIENTS[1].name, client_email: CLIENTS[1].email, client_phone: CLIENTS[1].phone, client_address: CLIENTS[1].address, title: 'Bathroom Renovation - Master Bath', status: 'sent', total: 8200, subtotal: 8200, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Bathroom Renovation', quantity: 1, unit_price: 8200, line_total: 8200 }]), created_date: daysAgo(10), sent_at: daysAgo(9) },
    { estimate_number: 1003, document_type: 'ESTIMATE', client_name: CLIENTS[2].name, client_email: CLIENTS[2].email, client_phone: CLIENTS[2].phone, client_address: CLIENTS[2].address, title: 'Property Maintenance - 3 Units', status: 'approved', total: 12600, subtotal: 12600, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Interior Painting', quantity: 3, unit_price: 3800, line_total: 11400 }, { service_name: 'Drywall Repair', quantity: 1, unit_price: 1200, line_total: 1200 }]), created_date: daysAgo(30), sent_at: daysAgo(29), signed_at: daysAgo(25) },
    { estimate_number: 1004, document_type: 'ESTIMATE', client_name: CLIENTS[3].name, client_email: CLIENTS[3].email, client_phone: CLIENTS[3].phone, client_address: CLIENTS[3].address, title: 'Window Replacement - 6 Windows', status: 'draft', total: 7400, subtotal: 7400, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Window Replacement', quantity: 6, unit_price: 1233, line_total: 7400 }]), created_date: daysAgo(2) },
    { estimate_number: 1005, document_type: 'ESTIMATE', client_name: CLIENTS[4].name, client_email: CLIENTS[4].email, client_phone: CLIENTS[4].phone, client_address: CLIENTS[4].address, title: 'Deck Construction - Composite', status: 'approved', total: 6800, subtotal: 6800, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Deck Construction', quantity: 1, unit_price: 6800, line_total: 6800 }]), created_date: daysAgo(60), sent_at: daysAgo(58), signed_at: daysAgo(55) },
    { estimate_number: 1006, document_type: 'ESTIMATE', client_name: CLIENTS[5].name, client_email: CLIENTS[5].email, client_phone: CLIENTS[5].phone, client_address: CLIENTS[5].address, title: 'Roof Repair - Storm Damage', status: 'sent', total: 4500, subtotal: 4500, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Roof Repair', quantity: 1, unit_price: 4500, line_total: 4500 }]), created_date: daysAgo(5), sent_at: daysAgo(4) },
    { estimate_number: 1007, document_type: 'ESTIMATE', client_name: CLIENTS[6].name, client_email: CLIENTS[6].email, client_phone: CLIENTS[6].phone, client_address: CLIENTS[6].address, title: 'Flooring Installation - 2 Apartments', status: 'signed', total: 11200, subtotal: 11200, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Flooring Installation', quantity: 2, unit_price: 5600, line_total: 11200 }]), created_date: daysAgo(20), sent_at: daysAgo(19), signed_at: daysAgo(15) },
    { estimate_number: 1008, document_type: 'ESTIMATE', client_name: CLIENTS[7].name, client_email: CLIENTS[7].email, client_phone: CLIENTS[7].phone, client_address: CLIENTS[7].address, title: 'Fence Installation - Cedar', status: 'draft', total: 3200, subtotal: 3200, tax_rate: 0, tax_amount: 0, line_items: JSON.stringify([{ service_name: 'Fence Installation', quantity: 1, unit_price: 3200, line_total: 3200 }]), created_date: daysAgo(1) },
  ];
  const { error: estErr } = await supabase.from('estimates').insert(estimates);
  if (estErr) console.warn('  ⚠ estimates:', estErr.message);
  else console.log(`  ✅ ${estimates.length} estimates inserted`);

  // ── 4. Work Orders ──
  console.log('🔧 Inserting work orders...');
  const workOrders = [
    { work_order_number: 2001, client_name: CLIENTS[0].name, client_address: CLIENTS[0].address, client_phone: CLIENTS[0].phone, title: 'Kitchen Remodel - Full Renovation', status: 'in_progress', total: 15500, assigned_to: 'Carlos Rivera', scheduled_date: daysAgo(30), notes: 'Phase 2: cabinets and countertops in progress', created_date: daysAgo(38) },
    { work_order_number: 2002, client_name: CLIENTS[2].name, client_address: CLIENTS[2].address, client_phone: CLIENTS[2].phone, title: 'Interior Painting - Unit A', status: 'completed', total: 3800, assigned_to: 'Miguel Santos', scheduled_date: daysAgo(18), notes: 'Completed - 2 coats, trim included', created_date: daysAgo(22) },
    { work_order_number: 2003, client_name: CLIENTS[2].name, client_address: CLIENTS[2].address, client_phone: CLIENTS[2].phone, title: 'Interior Painting - Unit B', status: 'completed', total: 3800, assigned_to: 'Miguel Santos', scheduled_date: daysAgo(14), notes: 'Completed ahead of schedule', created_date: daysAgo(22) },
    { work_order_number: 2004, client_name: CLIENTS[2].name, client_address: CLIENTS[2].address, client_phone: CLIENTS[2].phone, title: 'Drywall Repair + Painting - Unit C', status: 'in_progress', total: 5000, assigned_to: 'Miguel Santos', scheduled_date: daysAgo(2), notes: 'Drywall done, painting starts tomorrow', created_date: daysAgo(22) },
    { work_order_number: 2005, client_name: CLIENTS[4].name, client_address: CLIENTS[4].address, client_phone: CLIENTS[4].phone, title: 'Deck Construction - Composite', status: 'completed', total: 6800, assigned_to: 'Carlos Rivera', scheduled_date: daysAgo(40), notes: 'Completed - client very satisfied', created_date: daysAgo(50) },
    { work_order_number: 2006, client_name: CLIENTS[6].name, client_address: CLIENTS[6].address, client_phone: CLIENTS[6].phone, title: 'Flooring - Apartment 1', status: 'scheduled', total: 5600, assigned_to: 'Team B', scheduled_date: daysFromNow(3), notes: 'LVP flooring, 850 sqft', created_date: daysAgo(10) },
    { work_order_number: 2007, client_name: CLIENTS[6].name, client_address: CLIENTS[6].address, client_phone: CLIENTS[6].phone, title: 'Flooring - Apartment 2', status: 'draft', total: 5600, assigned_to: 'Team B', scheduled_date: daysFromNow(7), notes: 'Same spec as Apt 1', created_date: daysAgo(10) },
  ];
  const { error: woErr } = await supabase.from('work_orders').insert(workOrders);
  if (woErr) console.warn('  ⚠ work_orders:', woErr.message);
  else console.log(`  ✅ ${workOrders.length} work orders inserted`);

  // ── 5. Invoices ──
  console.log('💰 Inserting invoices...');
  const invoices = [
    { invoice_number: 3001, client_name: CLIENTS[4].name, client_email: CLIENTS[4].email, client_address: CLIENTS[4].address, title: 'Deck Construction - Final', status: 'paid', total: 6800, subtotal: 6800, tax_rate: 0, tax_amount: 0, amount_paid: 6800, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(35) + 'T10:00:00Z', due_date: daysAgo(30), line_items: JSON.stringify([{ service_name: 'Deck Construction', quantity: 1, unit_price: 6800, line_total: 6800 }]), created_date: daysAgo(40), sent_at: daysAgo(39) },
    { invoice_number: 3002, client_name: CLIENTS[2].name, client_email: CLIENTS[2].email, client_address: CLIENTS[2].address, title: 'Interior Painting - Unit A', status: 'paid', total: 3800, subtotal: 3800, tax_rate: 0, tax_amount: 0, amount_paid: 3800, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(12) + 'T14:30:00Z', due_date: daysAgo(8), line_items: JSON.stringify([{ service_name: 'Interior Painting', quantity: 1, unit_price: 3800, line_total: 3800 }]), created_date: daysAgo(16), sent_at: daysAgo(15) },
    { invoice_number: 3003, client_name: CLIENTS[2].name, client_email: CLIENTS[2].email, client_address: CLIENTS[2].address, title: 'Interior Painting - Unit B', status: 'paid', total: 3800, subtotal: 3800, tax_rate: 0, tax_amount: 0, amount_paid: 3800, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(5) + 'T09:15:00Z', due_date: daysAgo(4), line_items: JSON.stringify([{ service_name: 'Interior Painting', quantity: 1, unit_price: 3800, line_total: 3800 }]), created_date: daysAgo(12), sent_at: daysAgo(11) },
    { invoice_number: 3004, client_name: CLIENTS[0].name, client_email: CLIENTS[0].email, client_address: CLIENTS[0].address, title: 'Kitchen Remodel - Progress Payment 50%', status: 'paid', total: 7750, subtotal: 7750, tax_rate: 0, tax_amount: 0, amount_paid: 7750, balance_due: 0, payment_status: 'paid', paid_at: daysAgo(20) + 'T16:00:00Z', due_date: daysAgo(18), line_items: JSON.stringify([{ service_name: 'Kitchen Remodel (50% deposit)', quantity: 1, unit_price: 7750, line_total: 7750 }]), created_date: daysAgo(25), sent_at: daysAgo(24) },
    { invoice_number: 3005, client_name: CLIENTS[0].name, client_email: CLIENTS[0].email, client_address: CLIENTS[0].address, title: 'Kitchen Remodel - Balance Due', status: 'sent', total: 7750, subtotal: 7750, tax_rate: 0, tax_amount: 0, amount_paid: 0, balance_due: 7750, payment_status: 'unpaid', due_date: daysFromNow(5), line_items: JSON.stringify([{ service_name: 'Kitchen Remodel (final payment)', quantity: 1, unit_price: 7750, line_total: 7750 }]), created_date: daysAgo(3), sent_at: daysAgo(2) },
    { invoice_number: 3006, client_name: CLIENTS[2].name, client_email: CLIENTS[2].email, client_address: CLIENTS[2].address, title: 'Drywall + Painting - Unit C', status: 'sent', total: 5000, subtotal: 5000, tax_rate: 0, tax_amount: 0, amount_paid: 0, balance_due: 5000, payment_status: 'unpaid', due_date: daysAgo(2), line_items: JSON.stringify([{ service_name: 'Drywall Repair + Painting', quantity: 1, unit_price: 5000, line_total: 5000 }]), created_date: daysAgo(8), sent_at: daysAgo(7) },
  ];
  const { error: invErr } = await supabase.from('invoices').insert(invoices);
  if (invErr) console.warn('  ⚠ invoices:', invErr.message);
  else console.log(`  ✅ ${invoices.length} invoices inserted`);

  // ── 6. Appointments ──
  console.log('📅 Inserting appointments...');
  const appointments = [
    { client_name: CLIENTS[1].name, client_phone: CLIENTS[1].phone, appointment_date: today, appointment_time: '10:00', type: 'estimate_visit', notes: 'Master bath remodel assessment', status: 'scheduled', address: CLIENTS[1].address, created_date: daysAgo(3) },
    { client_name: CLIENTS[3].name, client_phone: CLIENTS[3].phone, appointment_date: today, appointment_time: '14:00', type: 'estimate_visit', notes: 'Window replacement measurement', status: 'scheduled', address: CLIENTS[3].address, created_date: daysAgo(2) },
    { client_name: 'Carlos Mendez', client_phone: '(503) 555-0345', appointment_date: daysFromNow(1), appointment_time: '09:00', type: 'inspection', notes: 'Fence damage inspection after storm', status: 'scheduled', address: '1456 SE Foster Rd, Portland, OR 97206', created_date: today },
    { client_name: CLIENTS[7].name, client_phone: CLIENTS[7].phone, appointment_date: daysFromNow(2), appointment_time: '11:00', type: 'estimate_visit', notes: 'Cedar fence - backyard', status: 'scheduled', address: CLIENTS[7].address, created_date: daysAgo(1) },
  ];
  const { error: apptErr } = await supabase.from('appointments').insert(appointments);
  if (apptErr) console.warn('  ⚠ appointments:', apptErr.message);
  else console.log(`  ✅ ${appointments.length} appointments inserted`);

  // ── 7. Proposals ──
  console.log('📋 Inserting proposals...');
  const proposals = [
    { proposal_number: 4001, client_name: CLIENTS[3].name, client_email: CLIENTS[3].email, title: 'Whole-House Window Upgrade Package', status: 'draft', total: 18500, created_date: daysAgo(2) },
  ];
  const { error: propErr } = await supabase.from('proposals').insert(proposals);
  if (propErr) console.warn('  ⚠ proposals:', propErr.message);
  else console.log(`  ✅ ${proposals.length} proposals inserted`);

  console.log('\n✅ Seed complete! Refresh your dashboard to see data.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  if (typeof globalThis !== 'undefined' && globalThis.process?.exit) {
    globalThis.process.exit(1);
  }
});