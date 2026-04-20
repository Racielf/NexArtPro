/**
 * recoveryRegistry.js
 *
 * Central registry of all soft-delete-enabled entities.
 * Add a new entry here whenever a new module is connected to the recovery system.
 *
 * Each entry defines:
 *   key          — unique identifier (used in UI/URL state)
 *   label        — display name (plural)
 *   entityName   — name used in logAuditEvent (singular)
 *   apiKey       — key on base44.entities (must match exact entity class name)
 *   labelField   — fn(record) → primary display label
 *   numField     — fn(record) → number/reference prefix, or null
 *   canRestore   — whether Restore button is shown
 *   canPurge     — whether Delete Permanently is shown
 */

import { User, Users, FileText, ClipboardList, Receipt, Briefcase, Package, Camera, FileCheck } from 'lucide-react';

export const RECOVERY_REGISTRY = [
  {
    key: 'customers',
    label: 'Customers',
    entityName: 'Customer',
    apiKey: 'Customer',
    icon: User,
    labelField: r => r.display_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—',
    numField: null,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'clients',
    label: 'Clients',
    entityName: 'Client',
    apiKey: 'Client',
    icon: Users,
    labelField: r => r.full_name || '—',
    numField: null,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'leads',
    label: 'Leads',
    entityName: 'Lead',
    apiKey: 'Lead',
    icon: Briefcase,
    labelField: r => r.name || r.email || '—',
    numField: null,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'estimates',
    label: 'Estimates',
    entityName: 'Estimate',
    apiKey: 'Estimate',
    icon: FileText,
    labelField: r => r.client_name || '—',
    numField: r => `#${r.estimate_number}`,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'proposals',
    label: 'Proposals',
    entityName: 'Proposal',
    apiKey: 'Proposal',
    icon: FileText,
    labelField: r => r.client_name || r.title || '—',
    numField: r => r.proposal_number ? `P#${r.proposal_number}` : null,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'workorders',
    label: 'Work Orders',
    entityName: 'WorkOrder',
    apiKey: 'WorkOrder',
    icon: ClipboardList,
    labelField: r => r.client_name || r.title || '—',
    numField: r => `WO#${r.work_order_number}`,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    entityName: 'Invoice',
    apiKey: 'Invoice',
    icon: Receipt,
    labelField: r => r.client_name || '—',
    numField: r => `INV#${r.invoice_number}`,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'workorderexpenses',
    label: 'Expenses',
    entityName: 'WorkOrderExpense',
    apiKey: 'WorkOrderExpense',
    icon: Package,
    labelField: r => r.description || '—',
    numField: r => r.work_order_number ? `WO#${r.work_order_number}` : null,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'projectphotos',
    label: 'Photos',
    entityName: 'ProjectPhoto',
    apiKey: 'ProjectPhoto',
    icon: Camera,
    labelField: r => r.caption || `${r.phase || 'photo'}`,
    numField: r => r.work_order_number ? `WO#${r.work_order_number}` : null,
    canRestore: true,
    canPurge: true,
  },
  {
    key: 'workerdocuments',
    label: 'Worker Documents',
    entityName: 'WorkerDocument',
    apiKey: 'WorkerDocument',
    icon: FileCheck,
    labelField: r => r.name || r.file_name || '—',
    numField: null,
    canRestore: true,
    canPurge: true,
  },
];

/**
 * Out-of-scope entities (intentionally excluded):
 *
 * - EstimateAttachments → stored as embedded array in Estimate entity; deletion is local array mutation persisted via Estimate update
 * - Payments         → financial ledger entries; deletion is not a standard user action; no delete UI exists
 * - Appointments     → no delete action in UI; status management only (cancelled)
 * - Workers          → no delete action in UI; deactivation (active=false) is the correct pattern
 */