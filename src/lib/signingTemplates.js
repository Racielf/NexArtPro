import { base44 } from '@/api/base44Client';

const toTimestamp = (value) => {
  const time = new Date(value ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export async function listSigningTemplates({ documentType = 'estimate' } = {}) {
  try {
    const rows = await base44.entities.SigningTemplate.filter({
      document_type: documentType,
      status: 'active',
    });
    return (rows ?? []).sort((a, b) =>
      toTimestamp(b.updated_at || b.created_at) - toTimestamp(a.updated_at || a.created_at)
    );
  } catch {
    return [];
  }
}

export async function createSigningTemplateFromPackage({ packageId, name }) {
  if (!packageId) throw new Error('packageId required');
  if (!name?.trim()) throw new Error('Template name required');

  const [pkgRows, participantRows] = await Promise.all([
    base44.entities.SigningPackage.filter({ id: packageId }),
    base44.entities.SigningParticipant.filter({ signing_package_id: packageId }).catch(() => []),
  ]);

  const pkg = pkgRows?.[0] ?? null;
  if (!pkg) throw new Error('Package not found');

  // Prioridad: field_config.fields > document_fields
  const fieldsFromConfig = pkg.field_config?.fields;
  const fieldsFromDoc = pkg.document_fields;

  if (fieldsFromConfig && fieldsFromDoc) {
    console.warn('[createSigningTemplateFromPackage] Both field_config.fields and document_fields exist — using field_config.fields');
  }

  const fields = fieldsFromConfig ?? fieldsFromDoc ?? [];

  // Roles desde participantes
  const roles = (participantRows).map((p, i) => ({
    role: p.role || 'client',
    signing_order: p.signing_order ?? i + 1,
  }));

  // Mapear participant_id → role
  const participantRoleMap = new Map(
    (participantRows)
      .filter((p) => p.id && p.role)
      .map((p) => [p.id, p.role]),
  );

  // Transformar fields para template
  const templateFields = fields.map((f) => {
    const resolvedRole = f.participant_id ? participantRoleMap.get(f.participant_id) ?? '' : '';
    const finalRole = resolvedRole || f.role || 'client';

    return {
      ...f,
      id: `tpl_${crypto.randomUUID()}`,
      participant_id: '',
      role: finalRole,
      participant_role: finalRole,
    };
  });

  const template = await base44.entities.SigningTemplate.create({
    name: name.trim(),
    document_type: pkg.document_type || 'estimate',
    company_id: pkg.company_id || 'rc-art',
    roles,
    field_config: {
      page_count: pkg.page_count ?? 1,
      fields: templateFields,
    },
    created_at: new Date().toISOString(),
  });

  return template;
}

export async function applySigningTemplateToPackage({ packageId, templateId }) {
  if (!packageId) throw new Error('packageId required');
  if (!templateId) throw new Error('templateId required');

  const [pkgRows, templateRows, participantRows] = await Promise.all([
    base44.entities.SigningPackage.filter({ id: packageId }),
    base44.entities.SigningTemplate.filter({ id: templateId }),
    base44.entities.SigningParticipant.filter({ signing_package_id: packageId }).catch(() => []),
  ]);

  const pkg = pkgRows?.[0] ?? null;
  const template = templateRows?.[0] ?? null;

  if (!pkg) throw new Error('Package not found');
  if (!template) throw new Error('Template not found');

  const participantByRole = new Map(
    participantRows.filter((p) => p.role).map((p) => [String(p.role), p]),
  );

  const templateFields = template.field_config?.fields ?? [];

  const appliedFields = templateFields.map((field, index) => {
    const role = String(field.participant_role || field.role || 'client');
    const participant = participantByRole.get(role);
    return {
      ...field,
      id: `field_${crypto.randomUUID()}`,
      participant_id: participant?.id || '',
      participant_role: role,
      role,
      order: index + 1,
    };
  });

  const nextFieldConfig = {
    version: Number(pkg.field_config?.version || 0) + 1,
    page_count: template.field_config?.page_count || pkg.page_count || 1,
    coordinate_system: { width: 820, height: 1060, unit: 'editor_px' },
    fields: appliedFields,
    applied_template_id: template.id,
    applied_template_name: template.name || '',
    updated_at: new Date().toISOString(),
  };

  await base44.entities.SigningPackage.update(pkg.id, {
    field_config: nextFieldConfig,
    document_fields: appliedFields,
    page_count: nextFieldConfig.page_count,
    audit_summary: {
      ...(pkg.audit_summary || {}),
      applied_template_id: template.id,
      applied_template_name: template.name || '',
      field_count: appliedFields.length,
      field_config_version: nextFieldConfig.version,
      template_applied_at: nextFieldConfig.updated_at,
    },
  });

  return {
    package: { ...pkg, field_config: nextFieldConfig, document_fields: appliedFields, page_count: nextFieldConfig.page_count },
    template,
  };
}