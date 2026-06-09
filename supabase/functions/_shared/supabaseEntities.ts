/**
 * NexArtPro — Supabase Entity Helper
 * Replaces base44.asServiceRole.entities.* with direct Supabase queries.
 * This provides a consistent API for all Edge Functions migrated from Base44.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Entity name → table name mapping
const TABLE_MAP: Record<string, string> = {
  SigningPackage: 'signing_packages',
  SigningParticipant: 'signing_participants',
  SigningEvent: 'signing_events',
  SigningCertificate: 'signing_certificates',
  Estimate: 'estimates',
  WorkOrder: 'work_orders',
  Invoice: 'invoices',
};

export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tableName(entity: string) {
  const name = TABLE_MAP[entity];
  if (!name) throw new Error(`Unknown entity: ${entity}`);
  return name;
}

/**
 * Provides a drop-in replacement for base44.asServiceRole.entities.*
 * 
 * Usage:
 *   const db = supabaseEntities(supabase);
 *   const rows = await db.SigningPackage.filter({ id: 'xxx' });
 *   await db.SigningPackage.update('xxx', { status: 'signed' });
 *   const created = await db.SigningPackage.create({ ... });
 */
export function supabaseEntities(supabase: any) {
  function entityProxy(entityName: string) {
    const table = tableName(entityName);

    return {
      /**
       * Filter rows matching the given criteria.
       * Equivalent to: base44.asServiceRole.entities.X.filter(criteria)
       */
      async filter(criteria: Record<string, any>, orderBy?: string) {
        let query = supabase.from(table).select('*');
        for (const [key, value] of Object.entries(criteria)) {
          query = query.eq(key, value);
        }
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const col = desc ? orderBy.slice(1) : orderBy;
          query = query.order(col, { ascending: !desc });
        }
        const { data, error } = await query;
        if (error) throw new Error(`[${entityName}.filter] ${error.message}`);
        return data || [];
      },

      /**
       * List all rows, optionally ordered.
       * Equivalent to: base44.asServiceRole.entities.X.list(orderBy)
       */
      async list(orderBy?: string) {
        let query = supabase.from(table).select('*');
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const col = desc ? orderBy.slice(1) : orderBy;
          query = query.order(col, { ascending: !desc });
        }
        const { data, error } = await query;
        if (error) throw new Error(`[${entityName}.list] ${error.message}`);
        return data || [];
      },

      /**
       * Update a row by ID.
       * Equivalent to: base44.asServiceRole.entities.X.update(id, data)
       */
      async update(id: string, updateData: Record<string, any>) {
        const { data, error } = await supabase
          .from(table)
          .update({ ...updateData, updated_date: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`[${entityName}.update] ${error.message}`);
        return data;
      },

      /**
       * Create a new row.
       * Equivalent to: base44.asServiceRole.entities.X.create(data)
       */
      async create(createData: Record<string, any>) {
        const { data, error } = await supabase
          .from(table)
          .insert(createData)
          .select()
          .single();
        if (error) throw new Error(`[${entityName}.create] ${error.message}`);
        return data;
      },
    };
  }

  return {
    SigningPackage: entityProxy('SigningPackage'),
    SigningParticipant: entityProxy('SigningParticipant'),
    SigningEvent: entityProxy('SigningEvent'),
    SigningCertificate: entityProxy('SigningCertificate'),
    Estimate: entityProxy('Estimate'),
    WorkOrder: entityProxy('WorkOrder'),
    Invoice: entityProxy('Invoice'),
  };
}
