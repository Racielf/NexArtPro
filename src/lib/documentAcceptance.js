/**
 * documentAcceptance.js
 *
 * Centralized acceptance service for estimates and proposals.
 * Handles view tracking, acceptance proof snapshots, and decline/changes.
 *
 * CRITICAL: acceptance_proof snapshots must NEVER include internal-only fields
 * (unit_cost, margin, internal_notes, hidden attachments).
 */
import { base44 } from '@/api/base44Client';

// ─── Client metadata helpers ───────────────────────────────────────────────

async function getClientIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const d = await r.json();
    return d.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getUserAgent() {
  return navigator.userAgent || 'unknown';
}

// ─── Sanitize line items (strip internal fields) ───────────────────────────

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    id: item.id,
    service_name: item.service_name || item.name || '',
    description: item.description || '',
    quantity: item.quantity || 0,
    unit: item.unit || '',
    unit_price: item.unit_price || 0,
    line_total: item.line_total || item.total_price || 0,
  }));
}

function sanitizeGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map(g => ({
    id: g.id,
    name: g.name || '',
    items: sanitizeItems(g.items),
  }));
}

function sanitizeMaterials(materials) {
  if (!Array.isArray(materials)) return [];
  return materials.map(m => ({
    id: m.id,
    name: m.name || '',
    description: m.description || '',
    quantity: m.quantity || 0,
    unit: m.unit || '',
    unit_price: m.unit_price || 0,
    line_total: m.line_total || 0,
  }));
}

// ─── Acceptance proof builder ──────────────────────────────────────────────

/**
 * Build an immutable acceptance proof snapshot.
 * Only includes client-safe, commercial/legal data.
 */
export function buildAcceptanceProof({
  documentType,       // 'estimate' | 'proposal'
  document,           // full document record
  acceptanceMethod,   // 'typed' | 'drawn' | 'approve_only'
  signerName,
  signerEmail,
  signatureOnFile,    // boolean
  clientIP,
  userAgent,
}) {
  const ts = new Date().toISOString();

  // Common commercial data
  const proof = {
    // Identity
    document_type: documentType,
    document_id: document.id,
    document_number: documentType === 'estimate'
      ? document.estimate_number
      : document.proposal_number,
    document_title: document.title || '',
    version: document.version || 1,

    // Client
    client_name: document.client_name || '',
    client_email: document.client_email || '',

    // Acceptance event
    accepted_at: ts,
    accepted_ip: clientIP || 'unknown',
    accepted_user_agent: userAgent || 'unknown',
    acceptance_method: acceptanceMethod,
    accepted_by_name: signerName || document.client_name || '',
    signature_on_file: signatureOnFile || false,

    // Document state at acceptance
    status_at_acceptance: document.status || 'unknown',
    total: documentType === 'estimate' ? (document.total || 0) : (document.total_amount || 0),
    subtotal: document.subtotal || 0,
    tax_rate: document.tax_rate || 0,
    tax_amount: document.tax_amount || 0,
    discount_value: document.discount_value || 0,

    // Scope snapshot (sanitized — no cost/margin)
    groups_snapshot: sanitizeGroups(document.groups),
    items_snapshot: sanitizeItems(document.items || document.line_items),
    materials_snapshot: sanitizeMaterials(document.materials),

    // Terms snapshot
    payment_terms: document.payment_terms || '',
    legal_terms: document.legal_terms || '',
    notes: document.notes || '',
    exclusions: document.exclusions || '',
    warranty_terms: document.warranty_terms || '',

    // Config
    template: document.document_config?.template || document.template_name || 'clean',
    document_config: document.document_config || null,
    document_language: document.document_language || 'en',
  };

  return proof;
}

// ─── View tracking ─────────────────────────────────────────────────────────

/**
 * Track a public document view for proposals.
 * For estimates, use markEstimateViewed from estimateSalesLifecycle.js.
 */
export async function trackProposalView(proposalId, currentProposal) {
  const ts = new Date().toISOString();
  const payload = {
    viewed_at: currentProposal.viewed_at || ts,
    last_viewed_at: ts,
    view_count: (currentProposal.view_count || 0) + 1,
  };
  await base44.entities.Proposal.update(proposalId, payload);
  return payload;
}

// ─── Proposal acceptance ───────────────────────────────────────────────────

/**
 * Accept a proposal with proof snapshot.
 */
export async function acceptProposal(proposalId, proposal, {
  acceptanceMethod = 'typed',
  signerName,
  signerEmail,
  signatureBase64,
}) {
  const clientIP = await getClientIP();
  const userAgent = getUserAgent();
  const signatureOnFile = !!(signatureBase64 && signatureBase64.length > 50);

  const proof = buildAcceptanceProof({
    documentType: 'proposal',
    document: proposal,
    acceptanceMethod,
    signerName,
    signerEmail,
    signatureOnFile,
    clientIP,
    userAgent,
  });

  const ts = new Date().toISOString();
  const payload = {
    status: 'accepted',
    accepted_at: ts,
    accepted_ip: clientIP,
    accepted_by_name: signerName || proposal.client_name,
    acceptance_proof: proof,
    signature_on_file: signatureOnFile,
  };

  if (signatureBase64) {
    payload.signature_image_base64 = signatureBase64;
  }

  await base44.entities.Proposal.update(proposalId, payload);
  return payload;
}

// ─── Estimate acceptance proof (used by lifecycle) ─────────────────────────

/**
 * Build estimate acceptance proof for approve/sign flows.
 * Called from estimateSalesLifecycle.js functions.
 */
export async function buildEstimateAcceptanceProof(estimate, {
  acceptanceMethod,
  signerName,
  signerEmail,
}) {
  const clientIP = await getClientIP();
  const userAgent = getUserAgent();
  const signatureOnFile = acceptanceMethod === 'drawn';

  return buildAcceptanceProof({
    documentType: 'estimate',
    document: estimate,
    acceptanceMethod,
    signerName: signerName || estimate.client_name,
    signerEmail,
    signatureOnFile,
    clientIP,
    userAgent,
  });
}