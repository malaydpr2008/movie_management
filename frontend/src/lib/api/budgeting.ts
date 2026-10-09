import { apiFetch } from "./client";
import {
  BudgetSummary,
  BudgetAccountIn,
  BudgetAccountOut,
  LineItemIn,
  LineItemOut,
} from "../types";

export const budgetingApi = {
  getBudgetSummary: (projectId: string) =>
    apiFetch<BudgetSummary>(`/financials/projects/${projectId}/budget-summary`),
  createBudgetAccount: (projectId: string, payload: BudgetAccountIn) =>
    apiFetch<BudgetAccountOut>(`/financials/projects/${projectId}/accounts`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getLineItems: (accountId: string) =>
    apiFetch<LineItemOut[]>(`/financials/accounts/${accountId}/items`),
  createLineItem: (accountId: string, payload: LineItemIn) =>
    apiFetch<LineItemOut>(`/financials/accounts/${accountId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLineItem: (itemId: string, payload: LineItemIn) =>
    apiFetch<LineItemOut>(`/financials/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLineItem: (itemId: string) =>
    apiFetch<{ success: boolean }>(`/financials/items/${itemId}`, {
      method: "DELETE",
    }),
};
