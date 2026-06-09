/**
 * Company Type Definition
 * Frontend structure for company context in multi-company SaaS
 */

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  app_logo_url?: string;
  website?: string;
  created_at?: string;
}

export type CompanyId = string;