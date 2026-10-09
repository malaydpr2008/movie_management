"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetingApi } from "@/lib/api/budgeting";
import { BudgetAccountIn, LineItemIn, LineItemOut, BudgetSummary } from "@/lib/types";

export const budgetingKeys = {
  all: ["budgeting"] as const,
  summary: (projectId: string) => ["budgetSummary", projectId] as const,
  lineItems: (accountId: string) => ["lineItems", accountId] as const,
};

export function useBudgetSummary(projectId: string) {
  return useQuery<BudgetSummary>({
    queryKey: budgetingKeys.summary(projectId),
    queryFn: () => budgetingApi.getBudgetSummary(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateBudgetAccount(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BudgetAccountIn) => budgetingApi.createBudgetAccount(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetingKeys.summary(projectId) });
    },
  });
}

export function useLineItems(accountId: string) {
  return useQuery<LineItemOut[]>({
    queryKey: budgetingKeys.lineItems(accountId),
    queryFn: () => budgetingApi.getLineItems(accountId),
    enabled: Boolean(accountId),
  });
}

export function useCreateLineItem(accountId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LineItemIn) => budgetingApi.createLineItem(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetingKeys.lineItems(accountId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: budgetingKeys.summary(projectId) });
      }
    },
  });
}

export function useUpdateLineItem(accountId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: LineItemIn }) =>
      budgetingApi.updateLineItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetingKeys.lineItems(accountId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: budgetingKeys.summary(projectId) });
      }
    },
  });
}

export function useDeleteLineItem(accountId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => budgetingApi.deleteLineItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetingKeys.lineItems(accountId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: budgetingKeys.summary(projectId) });
      }
    },
  });
}
