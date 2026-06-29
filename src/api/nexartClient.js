/**
 * NexArtPro — Supabase Data Client
 * Supabase data client compatible with the previous entity-operation pattern.
 *
 * Usage:
 *   import { nexartClient } from '@/api/nexartClient';
 *   const items = await nexartClient.entities.Estimate.list('-created_date', 100);
 *   const filtered = await nexartClient.entities.Invoice.filter({ client_id: 'abc' });
 *   const created = await nexartClient.entities.Estimate.create({ ... });
 *   await nexartClient.entities.Estimate.update(id, { ... });
 *   await nexartClient.entities.Estimate.delete(id);
 */

import { supabase } from '@/lib/supabaseClient';

// ─── Table name mapping ───────────────────────────────────────────
// Maps NexArt entity names → Supabase table names (snake_case plural)
const TABLE_MAP = {
  Appointment:           'appointments',
  AuditLog:              'audit_logs',
  AuthSecurityLog:       'auth_security_logs',
  BankAccount:           'bank_accounts',
  BankTransaction:       'bank_transactions',
  CapitalCall:           'capital_calls',
  CapitalContribution:   'capital_contributions',
  Client:                'clients',
  CommEvent:             'comm_events',
  Customer:              'customers',
  DocumentLog:           'document_logs',
  Estimate:              'estimates',
  EstimateSnapshot:      'estimate_snapshots',
  EstimateTransmission:  'estimate_transmissions',
  EstimateVersionHistory:'estimate_version_histories',
  FlipAnalysis:          'flip_analyses',
  Investor:              'investors',
  InvestorCompany:       'investor_companies',
  Invoice:               'invoices',
  JobAssignment:         'job_assignments',
  Lead:                  'leads',
  Material:              'materials',
  Payment:               'payments',
  PriceBookEntry:        'price_book_entries',
  PricingAuditEvent:     'pricing_audit_events',
  Project:               'projects',
  ProjectDisbursement:   'project_disbursements',
  ProjectExpense:        'project_expenses',
  ProjectInvestor:       'project_investors',
  ProjectPhoto:          'project_photos',
  ProjectRefund:         'project_refunds',
  Proposal:              'proposals',
  PublicDocumentAccess:   'public_document_access',
  RecoveryVault:         'recovery_vault',
  Service:               'services',
  SigningCertificate:     'signing_certificates',
  SigningEvent:           'signing_events',
  SigningPackage:         'signing_packages',
  SigningParticipant:     'signing_participants',
  TimeEntry:             'time_entries',
  TimeTrackingLog:       'time_tracking_logs',
  User:                  'app_users',
  WorkOrder:             'work_orders',
  WorkOrderDailyReport:  'work_order_daily_reports',
  WorkOrderExpense:      'work_order_expenses',
  WorkOrderHistory:      'work_order_histories',
  WorkOrderLineItem:     'wo_line_items',
  WorkOrderPhoto:        'wo_photos',
  WorkOrderComm:         'wo_communications',
  WorkOrderDocument:     'wo_documents',
  WorkOrderReceipt:      'work_order_receipts',
  WorkOrderTimeEntry:    'work_order_time_entries',
  ChangeOrder:           'change_orders',
  Worker:                'workers',
  WorkerDocument:        'worker_documents',
  WorkerNote:            'worker_notes',
};

// ─── Timestamp style per table ───────────────────────────────────
// Investor Hub tables use created_at/updated_at (TWO convention).
// All other MAIN tables use created_date/updated_date.
const USES_AT_TIMESTAMPS = new Set([
  'projects', 'project_expenses', 'project_refunds', 'project_disbursements',
  'investor_companies', 'investors', 'project_investors', 'capital_contributions', 'capital_calls',
  'flip_analyses',
  'wo_line_items', 'wo_photos', 'wo_communications', 'wo_documents', 'change_orders',
]);

// ─── Sort parser ──────────────────────────────────────────────────
// NexArt-compatible sorting uses '-field_name' for descending, 'field_name' for ascending
function parseSort(sortStr) {
  if (!sortStr || typeof sortStr !== 'string') return { column: 'created_date', ascending: false };
  const desc = sortStr.startsWith('-');
  const column = desc ? sortStr.slice(1) : sortStr;
  return { column, ascending: !desc };
}

// ─── Filter builder ───────────────────────────────────────────────
// Converts NexArt filter objects to Supabase .eq/.in/.gte/etc. chains
function applyFilters(query, filters) {
  if (!filters || typeof filters !== 'object') return query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle operators like { $exists: true }, { $in: [...] }, { $gte: ... }
      for (const [op, opVal] of Object.entries(value)) {
        switch (op) {
          case '$exists':
            query = opVal ? query.not(key, 'is', null) : query.is(key, null);
            break;
          case '$in':
            query = query.in(key, opVal);
            break;
          case '$gte':
            query = query.gte(key, opVal);
            break;
          case '$lte':
            query = query.lte(key, opVal);
            break;
          case '$gt':
            query = query.gt(key, opVal);
            break;
          case '$lt':
            query = query.lt(key, opVal);
            break;
          case '$ne':
            query = query.neq(key, opVal);
            break;
          default:
            console.warn(`[SupabaseData] Unknown operator: ${op}`);
        }
      }
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

// ─── Entity class ─────────────────────────────────────────────────
class SupabaseEntity {
  constructor(entityName) {
    this.entityName = entityName;
    this.table = TABLE_MAP[entityName];
    if (!this.table) {
      console.warn(`[SupabaseData] No table mapping for entity "${entityName}", using lowercase`);
      this.table = entityName.toLowerCase() + 's';
    }
  }

  /**
   * List all records, optionally sorted and limited.
   * @param {string} sort - e.g. '-created_date' for descending
   * @param {number} limit - max records (default 1000)
   */
  async list(sort = '-created_date', limit = 1000) {
    const { column, ascending } = parseSort(sort);
    let query = supabase.from(this.table).select('*').order(column, { ascending }).limit(limit);
    const { data, error } = await query;
    if (error) {
      console.error(`[SupabaseData] ${this.entityName}.list error:`, error);
      throw error;
    }
    return data || [];
  }

  /**
   * Filter records by conditions.
   * @param {object} conditions - e.g. { client_id: 'abc', status: 'active' }
   * @param {string} sort - e.g. '-created_date' or '-created_at' for investor tables
   * @param {number} limit - max records
   * @param {string} columns - Supabase select expression, supports joins e.g. '*, investor:investors(id,name)'
   */
  async filter(conditions = {}, sort = '-created_date', limit = 1000, columns = '*') {
    const { column, ascending } = parseSort(sort);
    let query = supabase.from(this.table).select(columns);
    query = applyFilters(query, conditions);
    query = query.order(column, { ascending }).limit(limit);
    const { data, error } = await query;
    if (error) {
      console.error(`[SupabaseData] ${this.entityName}.filter error:`, error);
      throw error;
    }
    return data || [];
  }

  /**
   * Create a new record.
   * @param {object} record - the data to insert
   * @returns {object} the created record with id
   */
  async create(record) {
    const payload = { ...record };
    if (USES_AT_TIMESTAMPS.has(this.table)) {
      // Investor Hub tables: DB handles created_at via DEFAULT now(); only set updated_at
      if (!payload.updated_at) payload.updated_at = new Date().toISOString();
    } else {
      if (!payload.created_date) payload.created_date = new Date().toISOString();
      if (!payload.updated_date) payload.updated_date = new Date().toISOString();
    }

    const { data, error } = await supabase.from(this.table).insert(payload).select().single();
    if (error) {
      console.error(`[SupabaseData] ${this.entityName}.create error:`, error);
      throw error;
    }
    return data;
  }

  /**
   * Update a record by ID.
   * @param {string|number} id - record ID
   * @param {object} updates - fields to update
   */
  async update(id, updates) {
    const tsField = USES_AT_TIMESTAMPS.has(this.table) ? 'updated_at' : 'updated_date';
    const payload = { ...updates, [tsField]: new Date().toISOString() };
    const { data, error } = await supabase.from(this.table).update(payload).eq('id', id).select().single();
    if (error) {
      console.error(`[SupabaseData] ${this.entityName}.update error:`, error);
      throw error;
    }
    return data;
  }

  /**
   * Delete a record by ID.
   * @param {string|number} id - record ID
   */
  async delete(id) {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) {
      console.error(`[SupabaseData] ${this.entityName}.delete error:`, error);
      throw error;
    }
    return true;
  }
}

// ─── Entity proxy ─────────────────────────────────────────────────
// Creates entity instances on-the-fly: nexartClient.entities.Estimate → new SupabaseEntity('Estimate')
const entityCache = {};
const entitiesProxy = new Proxy({}, {
  get(_, entityName) {
    if (!entityCache[entityName]) {
      entityCache[entityName] = new SupabaseEntity(entityName);
    }
    return entityCache[entityName];
  }
});

// ─── Functions proxy ──────────────────────────────────────────────
// Replaces nexartClient.functions.FunctionName(params) with Supabase Edge Function calls.
// Supports TWO calling patterns:
//   1. nexartClient.functions.sendEstimateEmail(params)    → returns data directly
//   2. nexartClient.functions.invoke('sendEstimateEmail', params) → returns { data } (Supabase SDK shape)
const functionsProxy = new Proxy({}, {
  get(_, functionName) {
    // Pattern 2: nexartClient.functions.invoke('functionName', params)
    if (functionName === 'invoke') {
      return async (fnName, params = {}) => {
        const { data, error } = await supabase.functions.invoke(fnName, { body: params });
        if (error) {
          console.error(`[SupabaseData] Function ${fnName} error:`, error);
          // Attach parsed response body so callers can extract code/message
          const enriched = new Error(error.message || 'Edge Function error');
          enriched.code = 'function_error';
          try {
            const body = typeof error.context?.json === 'function' ? await error.context.json() : (error.context || null);
            enriched.data = body;
          } catch { enriched.data = null; }
          throw enriched;
        }
        return { data };
      };
    }
    // Pattern 1: nexartClient.functions.FunctionName(params)
    return async (params = {}) => {
      const { data, error } = await supabase.functions.invoke(functionName, { body: params });
      if (error) {
        console.error(`[SupabaseData] Function ${functionName} error:`, error);
        const enriched = new Error(error.message || 'Edge Function error');
        enriched.code = 'function_error';
        try {
          const body = typeof error.context?.json === 'function' ? await error.context.json() : (error.context || null);
          enriched.data = body;
        } catch { enriched.data = null; }
        throw enriched;
      }
      return data;
    };
  }
});

// ─── Integrations proxy ───────────────────────────────────────────
// Drop-in replacement for nexartClient.integrations.Core.{SendEmail, UploadFile, CreateFileSignedUrl, InvokeLLM}
const integrationsCore = {
  async SendEmail(params = {}) {
    // Route through Resend via Edge Function
    const { data, error } = await supabase.functions.invoke('sendEmail', { body: params });
    if (error) {
      console.error('[SupabaseData] SendEmail error:', error);
      throw error;
    }
    return data || { success: true };
  },

  async UploadFile({ file }) {
    if (!file) throw new Error('No file provided for upload');
    const ext = file.name ? file.name.split('.').pop() : 'bin';
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true });
    if (error) {
      console.error('[SupabaseData] UploadFile error:', error);
      throw error;
    }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(data.path);
    return { file_url: urlData?.publicUrl || '' };
  },

  async CreateFileSignedUrl({ file_url, expiry_seconds = 3600 }) {
    // Extract the storage path from the full URL
    const bucketUrl = `${supabase.storageUrl || supabase.supabaseUrl}/storage/v1/object/public/documents/`;
    const path = file_url?.replace(bucketUrl, '') || file_url;
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, expiry_seconds);
    if (error) {
      console.warn('[SupabaseData] CreateFileSignedUrl error:', error);
      return { signed_url: file_url }; // Fallback to original URL
    }
    return { signed_url: data?.signedUrl || file_url };
  },

  async InvokeLLM(params = {}) {
    // Stub — LLM calls not yet migrated; log and return empty
    console.warn('[SupabaseData] InvokeLLM not yet implemented on Supabase, params:', Object.keys(params));
    return { response: '' };
  },
};

const integrationsProxy = { Core: integrationsCore };

// ─── Auth proxy ───────────────────────────────────────────────────
// Stub for nexartClient.auth.me() / nexartClient.auth.updateMe() used across the app.
// Returns the current user from session/local storage until full Supabase Auth migration.
const USER_PROFILE_KEY = 'nexartpro_user_profile';

function getStoredUser() {
  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Default admin user based on login
  return {
    id: 'admin',
    email: 'admin@rcartconstruction.com',
    role: sessionStorage.getItem('user_role') || 'admin',
    name: sessionStorage.getItem('user_name') || 'Admin',
  };
}

const authProxy = {
  async me() {
    return getStoredUser();
  },
  async updateMe(updates) {
    const current = getStoredUser();
    const updated = { ...current, ...updates };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
    return updated;
  },
  redirectToLogin(url) {
    window.location.href = url || '/';
  },
};

// ─── Main export ──────────────────────────────────────────────────
// Maintains the same API shape as the previous data client
export const nexartClient = {
  entities: entitiesProxy,
  functions: functionsProxy,
  integrations: integrationsProxy,
  auth: authProxy,
  // asServiceRole — alias to regular entities (Supabase RLS + permissive policies handle access)
  asServiceRole: { entities: entitiesProxy },
};
