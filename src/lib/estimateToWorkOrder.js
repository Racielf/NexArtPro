import { base44 } from '@/api/base44Client';
import { getUsers } from '@/lib/userStore';
import { normalizeLocalRole } from '@/lib/roleUtils';

function now() {
  return new Date().toISOString();
}

function buildWorkOrderNumber() {
  return Date.now();
}

function buildTasksFromEstimate(estimate) {
  const groups = Array.isArray(estimate?.groups) ? estimate.groups : [];
  const tasks = [];

  groups.forEach((group, groupIndex) => {
    const items = Array.isArray(group.items) ? group.items : [];
    items.forEach((item, itemIndex) => {
      tasks.push({
        id: item.id || `${groupIndex}-${itemIndex}`,
        title: item.name || item.description || `Task ${tasks.length + 1}`,
        description: item.description || group.name || '',
        status: 'pending',
        assigned_to: '',
        order: tasks.length + 1,
      });
    });
  });

  return tasks;
}

function buildExecutionChecklist() {
  return [
    { id: 'materials_ready', item: 'Materials ready / verified', completed: false },
    { id: 'site_prepared', item: 'Job site prepared', completed: false },
    { id: 'work_completed', item: 'Work completed according to approved estimate', completed: false },
    { id: 'photos_uploaded', item: 'Completion photos uploaded', completed: false },
    { id: 'client_reviewed', item: 'Client reviewed completed work', completed: false },
  ];
}

function buildEstimateSnapshot(estimate) {
  return {
    estimate_number: estimate.estimate_number,
    version: estimate.version_number,
    total: estimate.total,
    subtotal: estimate.subtotal,
    materials_subtotal: estimate.materials_subtotal,
    materials_cost: estimate.materials_cost,
    other_costs_total: estimate.other_costs_total,
    total_cost: estimate.total_cost,
    gross_margin: estimate.gross_margin,
    gross_margin_pct: estimate.gross_margin_pct,
    payment_terms: estimate.payment_terms,
    warranty_terms: estimate.warranty_terms,
    exclusions: estimate.exclusions,
    scope_summary: estimate.scope_summary,
    assumptions: estimate.assumptions,
    signed_at: estimate.signed_at,
    signature_name: estimate.signature_name,
    final_signed_pdf_url: estimate.final_signed_pdf_url,
  };
}

function isFieldAgent(user) {
  return user?.active !== false && normalizeLocalRole(user?.role) === 'field_agent';
}

function matchUser(estimateAssignedTo, users) {
  const value = String(estimateAssignedTo || '').toLowerCase();
  return users.find(u =>
    String(u.id) === value ||
    (u.email && u.email.toLowerCase() === value) ||
    (u.display_name && u.display_name.toLowerCase() === value)
  );
}

export async function convertApprovedEstimateToWorkOrder(estimate, { actor = 'system' } = {}) {
  if (!estimate?.id) {
    throw new Error('Estimate is required');
  }

  if (!['approved', 'signed'].includes(estimate.status)) {
    throw new Error('Only approved or signed estimates can be converted to work orders');
  }

  const version = estimate.version_number || 1;
  const existing = await base44.entities.WorkOrder.filter({
    estimate_id: estimate.id,
    estimate_version: version,
  });

  if (existing && existing.length > 0) {
    return { workOrder: existing[0], created: false };
  }

  const users = await getUsers();
  const fieldAgents = (users || []).filter(isFieldAgent);

  let lead = null;
  let assignment_source = 'none';

  if (estimate.assigned_to) {
    const match = matchUser(estimate.assigned_to, fieldAgents);
    if (match) {
      lead = match;
      assignment_source = 'estimate_assigned_to';
    }
  }

  if (!lead && fieldAgents.length === 1) {
    lead = fieldAgents[0];
    assignment_source = 'single_field_agent';
  }

  const createdAt = now();

  const payload = {
    work_order_number: buildWorkOrderNumber(),

    estimate_id: estimate.id,
    estimate_version: version,

    source_estimate_id: estimate.id,
    source_estimate_number: estimate.estimate_number,
    source_estimate_version: version,
    source_document_type: estimate.document_type,
    source_estimate_status: estimate.status,
    source_estimate_total: estimate.total || 0,
    source_estimate_signed_at: estimate.signed_at || null,
    source_estimate_signed_by: estimate.signature_name || null,
    source_estimate_final_pdf_url: estimate.final_signed_pdf_url || null,
    source_estimate_snapshot: buildEstimateSnapshot(estimate),

    client_id: estimate.client_id || '',
    client_name: estimate.client_name || '',
    client_email: estimate.client_email || '',
    client_phone: estimate.client_phone || '',
    client_address: estimate.client_address || '',

    title: estimate.title || `Work Order from Estimate #${estimate.estimate_number || ''}`.trim(),
    description: estimate.notes || estimate.title || '',

    status: lead ? 'assigned' : 'draft',

    groups: estimate.groups || [],
    line_items: estimate.line_items || [],
    materials: estimate.materials || [],
    other_costs: estimate.other_costs || [],

    subtotal: estimate.subtotal || 0,
    total: estimate.total || 0,

    materials_subtotal: estimate.materials_subtotal || 0,
    materials_cost: estimate.materials_cost || 0,
    other_costs_total: estimate.other_costs_total || 0,
    total_cost: estimate.total_cost || 0,
    gross_margin: estimate.gross_margin || 0,
    gross_margin_pct: estimate.gross_margin_pct || 0,

    payment_terms: estimate.payment_terms || '',
    warranty_terms: estimate.warranty_terms || '',
    exclusions: estimate.exclusions || '',
    scope_summary: estimate.scope_summary || '',
    assumptions: estimate.assumptions || '',

    notes: estimate.notes || '',

    internal_notes: [
      `Created automatically from approved estimate #${estimate.estimate_number || ''}.`,
      `Converted by: ${actor}.`,
      `Assignment source: ${assignment_source}.`,
      `Converted at: ${createdAt}.`,
    ].filter(Boolean).join('\n'),

    tasks: buildTasksFromEstimate(estimate),
    execution_checklist: buildExecutionChecklist(),
    field_notes: [],

    assignment_source,

    ...(lead && {
      assigned_user_id: lead.id,
      assigned_worker_id: lead.id,
      assigned_to_id: lead.id,
      assigned_user_name: lead.display_name,
      assigned_worker_name: lead.display_name,
      assigned_to: lead.display_name,
      assigned_user_email: lead.email,
      assigned_worker_email: lead.email,
      assigned_email: lead.email,
      assigned_crew: [lead],
      assigned_crew_ids: [lead.id],
      assigned_crew_names: [lead.display_name],
      crew_size: 1,
      assigned_at: createdAt,
    }),

    company_id: 'rc-art',
  };

  const workOrder = await base44.entities.WorkOrder.create(payload);

  await base44.entities.Estimate.update(estimate.id, {
    status: 'converted',
    sales_stage: 'converted',
    converted_to_work_order_at: createdAt,
    converted_work_order_id: workOrder.id,
  });

  return { workOrder, created: true };
}
