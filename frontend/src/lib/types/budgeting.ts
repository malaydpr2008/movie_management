export interface BudgetAccountOut {
  id: string;
  project_id: string;
  account_number: string;
  category: string;
  description: string;
}

export interface BudgetAccountIn {
  account_number: string;
  category: string;
  description: string;
}

export interface LineItemOut {
  id: string;
  account_id: string;
  description: string;
  amount: number;
  currency: string;
  is_actual: boolean;
}

export interface LineItemIn {
  description: string;
  amount: number;
  currency?: string;
  is_actual?: boolean;
}

export interface BudgetSummary {
  ATL: { estimated: number; actual: number };
  BTL_PRODUCTION: { estimated: number; actual: number };
  BTL_POST: { estimated: number; actual: number };
  OTHER: { estimated: number; actual: number };
  accounts: {
    id: string;
    account_number: string;
    category: string;
    description: string;
    estimated: number;
    actual: number;
  }[];
}
