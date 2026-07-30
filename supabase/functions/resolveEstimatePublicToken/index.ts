/**
 * resolveEstimatePublicToken — Edge Function (Supabase)
 * Public endpoint (no login) that resolves an estimate's public share token to the estimate
 * data the client-facing view (/client-estimate) needs to render and act on it.
 * Ported from base44/functions/resolveEstimatePublicToken/entry.ts -- the original queried
 * columns (attachments, document_config, signing_package_token, final_signed_pdf_url, ...) that
 * never existed on the live `estimates` table (see docs/agent/BASE44_REMOVAL_PLAN.md). This
 * version only returns real columns; the frontend already treats those richer fields as optional.
 */
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json } from '../_shared/signingContext.ts';

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseToken(token: string) {
  const parts = String(token || '').split('_').filter(Boolean);

  if (parts.length === 2) {
    const [estimateId, signature] = parts;
    return { estimateId, signature, nonce: '', format: 'legacy' as const };
  }

  if (parts.length >= 3) {
    const [estimateId, nonce, ...rest] = parts;
    return { estimateId, nonce, signature: rest.join('_'), format: 'v2' as const };
  }

  return null;
}

async function findEstimateByToken(entities: any, token: string) {
  const directRows = await entities.Estimate.filter({ public_share_token: token }).catch(() => []);
  if (directRows?.[0]) return directRows[0];

  const parsed = parseToken(token);
  if (!parsed?.estimateId || !parsed?.signature) return null;

  const rows = await entities.Estimate.filter({ id: parsed.estimateId }).catch(() => []);
  const estimate = rows?.[0] || null;
  if (!estimate) return null;

  const legacySignature = await sha256Hex(`${parsed.estimateId}${estimate.client_email || ''}`);
  const currentSignature = parsed.nonce
    ? await sha256Hex(`${parsed.estimateId}:${parsed.nonce}:${estimate.client_email || ''}`)
    : '';

  if (parsed.signature === legacySignature || parsed.signature === currentSignature) {
    return estimate;
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return json({ error: 'Invalid or missing token' }, 400);
    }

    const estimate = await findEstimateByToken(entities, token);
    if (!estimate) {
      return json({ error: 'Estimate not found' }, 404);
    }

    // Client-safe subset: content the client is meant to see. Excludes internal cost/margin
    // fields (*_cost, margin_*, gross_margin*, net_profit*, total_book_value, total_variance,
    // internal_notes, assigned_to, sales_stage, approval_note) and soft-delete bookkeeping.
    return json({
      estimate: {
        id: estimate.id,
        estimate_number: estimate.estimate_number,
        document_type: estimate.document_type,
        document_language: estimate.document_language,
        title: estimate.title,
        description: estimate.description,
        client_id: estimate.client_id,
        client_name: estimate.client_name,
        client_email: estimate.client_email,
        client_phone: estimate.client_phone,
        client_address: estimate.client_address,
        status: estimate.status,
        groups: estimate.groups,
        sections: estimate.sections,
        line_items: estimate.line_items,
        materials: estimate.materials,
        other_costs: estimate.other_costs,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
        deposit_percent: estimate.deposit_percent,
        deposit_amount: estimate.deposit_amount,
        notes: estimate.notes,
        terms: estimate.terms,
        exclusions: estimate.exclusions,
        payment_terms: estimate.payment_terms,
        warranty_terms: estimate.warranty_terms,
        legal_terms: estimate.legal_terms,
        scope_summary: estimate.scope_summary,
        assumptions: estimate.assumptions,
        included_scope_bullets: estimate.included_scope_bullets,
        uncertainty_note: estimate.uncertainty_note,
        contingency_type: estimate.contingency_type,
        contingency_value: estimate.contingency_value,
        contingency_amount: estimate.contingency_amount,
        show_contingency_to_client: estimate.show_contingency_to_client,
        show_materials_to_client: estimate.show_materials_to_client,
        show_markup_to_client: estimate.show_markup_to_client,
        show_labor_to_client: estimate.show_labor_to_client,
        sent_at: estimate.sent_at,
        viewed_at: estimate.viewed_at,
        approved_at: estimate.approved_at,
        declined_at: estimate.declined_at,
        declined_reason: estimate.declined_reason,
        signed_at: estimate.signed_at,
        signer_name: estimate.signer_name,
        signature_name: estimate.signature_name,
        signature_data: estimate.signature_data,
        terms_accepted: estimate.terms_accepted,
        converted_at: estimate.converted_at,
        converted_to_work_order_id: estimate.converted_to_work_order_id,
        converted_to_invoice_id: estimate.converted_to_invoice_id,
        company_name: estimate.company_name,
        company_logo_url: estimate.company_logo_url,
        company_address: estimate.company_address,
        company_phone: estimate.company_phone,
        company_email: estimate.company_email,
        company_website: estimate.company_website,
        company_license: estimate.company_license,
        expiration_date: estimate.expiration_date,
      },
    });
  } catch (error: any) {
    return json({ error: error.message || 'Server error' }, 500);
  }
});
