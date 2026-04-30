import { base44 } from '@/api/base44Client';

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