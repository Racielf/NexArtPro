import { base44 } from '@/api/base44Client';

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

  const createdAt = now();
  const payload = {
    work_order_number: buildWorkOrderNumber(),
    estimate_id: estimate.id,
    estimate_version: version,
    client_id: estimate.client_id || '',
    client_name: estimate.client_name || '',
    client_email: estimate.client_email || '',
    client_phone: estimate.client_phone || '',
    client_address: estimate.client_address || '',
    title: estimate.title || `Work Order from Estimate #${estimate.estimate_number || ''}`.trim(),
    description: estimate.notes || estimate.title || '',
    status: 'draft',
    groups: estimate.groups || [],
    line_items: estimate.line_items || [],
    subtotal: estimate.subtotal || 0,
    total: estimate.total || 0,
    notes: estimate.notes || '',
    internal_notes: [
      `Created automatically from approved estimate #${estimate.estimate_number || ''}.`,
      `Converted by: ${actor}.`,
      `Converted at: ${createdAt}.`,
      estimate.final_signed_pdf_url ? `Final signed PDF: ${estimate.final_signed_pdf_url}` : '',
    ].filter(Boolean).join('\n'),
    tasks: buildTasksFromEstimate(estimate),
    execution_checklist: buildExecutionChecklist(),
    field_notes: [],
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
