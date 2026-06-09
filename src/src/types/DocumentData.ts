/**
 * DocumentData — Contrato limpio e inmutable de documento cliente.
 * Sin internal_notes, sin datos mutables.
 * Listo para pasar a renderer.
 */

export interface DocumentLineItem {
  id: string;
  service_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  taxable: boolean;
}

export interface DocumentGroup {
  id: string;
  name: string;
  items: DocumentLineItem[];
  subtotal: number;
}

export interface DocumentData {
  // Metadata
  estimate_number: number;
  client_name: string;
  client_email: string;
  client_address: string;
  client_phone: string;
  title: string;
  expiration_date: string | null;
  project_start_date: string | null;
  project_end_date: string | null;

  // Document structure
  groups: DocumentGroup[];

  // Financials (already calculated in estimate)
  subtotal: number;
  discount_amount: number;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  deposit_percent: number;
  deposit_amount: number;

  // Content (customer visible only)
  notes: string;
  exclusions: string;
  warranty_terms: string;
  payment_terms: string;
  legal_terms: string;

  // Status & timestamps
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  signed_at: string | null;

  // Signature (if signed)
  signer_name?: string;
  signature_image_base64?: string;
}