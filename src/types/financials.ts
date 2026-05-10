export interface Project {
  id: string;
  name: string;
  address?: string;
  purchase_date?: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  responsible?: string;
  purchase_price: number;
  down_payment: number;
  realtor_fee: number;
  loan_amount: number;
  title_company?: string;
  closing_costs: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectExpense {
  id: string;
  project_id: string;
  work_order_id?: string;
  vendor?: string;
  amount: number;
  date: string;
  category?: string;
  receipt_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProjectRefund {
  id: string;
  project_id: string;
  work_order_id?: string;
  expense_id?: string;
  vendor?: string;
  amount: number;
  date: string;
  receipt_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProjectDisbursement {
  id: string;
  project_id: string;
  work_order_id?: string;
  type: 'Check' | 'Cash' | 'Transfer';
  payee?: string;
  amount: number;
  date: string;
  document_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProjectFinancialSummary {
  project_id: string;
  name: string;
  total_expenses: number;
  total_refunds: number;
  total_disbursements: number;
  net_cost: number;
}
