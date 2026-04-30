import { base44 } from '@/api/base44Client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPackageFields(pkg) {
  const fieldsFromConfig = pkg.field_config?.fields;
  const fieldsFromDoc = pkg.document_fields;
  if (fieldsFromConfig && fieldsFromDoc) {
    console.warn('[signing-templates] Both field_config.fields and document_fields exist — using field_config.fields');
  }
  return fieldsFromConfig ?? fieldsFromDoc ?? [];
}

function normalizeRole(value) {
  return (value || 'client').trim().toLowerCase();
}

function buildParticipantRoleMap(participants) {
  return participants
    .filter((p) => p.role)
    .reduce((acc, p) => {
      const role = normalizeRole(p.role);
      if (!acc.has(role)) acc.set(role, []);
      acc.get(role).push(p);
      return acc;
    }, new Map());
}

async function safeLoadParticipants(packageId) {
  try {
    const rows = await base44.entities.SigningParticipant.filter({ signing_package_id: packageId });
    return rows ?? [];
  } catch (error) {
    console.warn('[signing-templates] Failed loading participants', { packageId, error });
    return [];
  }
}

const toTimestamp = (value) => {
  const time = new Date(value ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

// ─── Listar templates ─────────────────────────────────────────────────────────

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

// ─── Crear template desde paquete ─────────────────────────────────────────────

export async function createSigningTemplateFromPackage({ packageId, name }) {
  if (!packageId) throw new Error('packageId required');
  if (!name?.trim()) throw new Error('Template name required');

  const [pkgRows, participantRows] = await Promise.all([
    base44.entities.SigningPackage.filter({ id: packageId }),
    safeLoadParticipants(packageId),
  ]);

  const pkg = pkgRows?.[0] ?? null;
  if (!pkg) throw new Error('Package not found');

  const fields = getPackageFields(pkg);

  const roles = participantRows.map((p, i) => ({
    role: normalizeRole(p.role),
    signing_order: p.signing_order ?? i + 1,
  }));

  const participantRoleMap = new Map(
    participantRows.filter((p) => p.id && p.role).map((p) => [String(p.id), normalizeRole(p.role)]),
  );

  const templateFields = fields.map((f) => {
    const resolvedRole = f.participant_id ? participantRoleMap.get(String(f.participant_id)) ?? '' : '';
    const finalRole = normalizeRole(resolvedRole || String(f.role || ''));
    return {
      ...f,
      id: `tpl_${crypto.randomUUID()}`,
      participant_id: '',
      role: finalRole,
      participant_role: finalRole,
    };
  });

  const now = new Date().toISOString();

  return base44.entities.SigningTemplate.create({
    name: name.trim(),
    document_type: pkg.document_type || 'estimate',
    status: 'active',
    company_id: pkg.company_id || 'rc-art',
    roles,
    field_config: {
      page_count: pkg.page_count ?? 1,
      fields: templateFields,
    },
    created_at: now,
    updated_at: now,
  });
}

// ─── Aplicar template a paquete ───────────────────────────────────────────────

export async function applySigningTemplateToPackage({ packageId, templateId }) {
  if (!packageId) throw new Error('packageId required');
  if (!templateId) throw new Error('templateId required');

  const [pkgRows, templateRows, participantRows] = await Promise.all([
    base44.entities.SigningPackage.filter({ id: packageId }),
    base44.entities.SigningTemplate.filter({ id: templateId }),
    safeLoadParticipants(packageId),
  ]);

  const pkg = pkgRows?.[0] ?? null;
  const template = templateRows?.[0] ?? null;

  if (!pkg) throw new Error('Package not found');
  if (!template) throw new Error('Template not found');
  if (template.status && template.status !== 'active') throw new Error('Template is not active');

  const templateFields = template.field_config?.fields ?? [];
  const participantGroups = buildParticipantRoleMap(participantRows);
  const roleCursor = new Map();

  const appliedFields = templateFields.map((field, index) => {
    const role = normalizeRole(String(field.participant_role || field.role || 'client'));
    const group = participantGroups.get(role) ?? [];
    const cursor = roleCursor.get(role) ?? 0;
    const participant = group[cursor] ?? group[0];
    roleCursor.set(role, cursor + 1);
    return {
      ...field,
      id: `field_${crypto.randomUUID()}`,
      participant_id: participant?.id || '',
      participant_role: role,
      role,
      order: index + 1,
    };
  });

  const updatedAt = new Date().toISOString();
  const nextFieldConfig = {
    version: Number(pkg.field_config?.version || 0) + 1,
    page_count: template.field_config?.page_count || pkg.page_count || 1,
    coordinate_system: { width: 820, height: 1060, unit: 'editor_px' },
    fields: appliedFields,
    applied_template_id: template.id,
    applied_template_name: template.name || '',
    updated_at: updatedAt,
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
      template_applied_at: updatedAt,
    },
  });

  return {
    package: { ...pkg, field_config: nextFieldConfig, document_fields: appliedFields, page_count: nextFieldConfig.page_count },
    template,
  };
}