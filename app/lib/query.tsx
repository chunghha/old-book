import React, { createContext, useContext } from "react";
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { getAdapter } from "../db";
import type {
  Transaction,
  Account,
  Budget,
  RecurringTransaction,
} from "../db/types";

// Create a client with sensible defaults for a local-first app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Local data doesn't need refetching
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query Keys - centralized for consistency
export const queryKeys = {
  transactions: ["transactions"] as const,
  transaction: (id: string) => ["transactions", id] as const,
  accounts: ["accounts"] as const,
  account: (id: string) => ["accounts", id] as const,
  budgets: ["budgets"] as const,
  budget: (id: string) => ["budgets", id] as const,
  recurring: ["recurring"] as const,
  recurringItem: (id: string) => ["recurring", id] as const,
};

// Provider component
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}

// Export the query client for direct access if needed
export { queryClient };

// ============================================================
// Transaction Hooks
// ============================================================

export function useTransactions(): UseQueryResult<Transaction[], Error> {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async () => {
      const db = await getAdapter();
      return db.getAll();
    },
  });
}

export function useAddTransaction(): UseMutationResult<
  void,
  Error,
  Omit<Transaction, "id" | "createdAt">
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const db = await getAdapter();
      const now = new Date().toISOString();
      const transaction: Transaction = {
        ...data,
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      await db.add(transaction);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

export function useUpdateTransaction(): UseMutationResult<
  void,
  Error,
  { id: string; data: Partial<Transaction> }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const db = await getAdapter();
      await db.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

export function useDeleteTransaction(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const db = await getAdapter();
      await db.delete(id);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

export function useBulkDeleteTransactions(): UseMutationResult<
  void,
  Error,
  string[]
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (ids) => {
      const db = await getAdapter();
      await db.bulkDelete(ids);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

export function useImportTransactions(): UseMutationResult<
  void,
  Error,
  Transaction[]
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (transactions) => {
      const db = await getAdapter();
      await db.import(transactions);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

// ============================================================
// Account Hooks
// ============================================================

export function useAccounts(): UseQueryResult<Account[], Error> {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const db = await getAdapter();
      return db.getAllAccounts();
    },
  });
}

export function useActiveAccounts(): UseQueryResult<Account[], Error> {
  return useQuery({
    queryKey: [...queryKeys.accounts, "active"],
    queryFn: async () => {
      const db = await getAdapter();
      const accounts = await db.getAllAccounts();
      return accounts.filter((a) => a.isActive);
    },
  });
}

export function useAddAccount(): UseMutationResult<
  void,
  Error,
  Omit<Account, "id" | "createdAt">
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const db = await getAdapter();
      const now = new Date().toISOString();
      const account: Account = {
        ...data,
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      await db.addAccount(account);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useUpdateAccount(): UseMutationResult<
  void,
  Error,
  { id: string; data: Partial<Account> }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const db = await getAdapter();
      await db.updateAccount(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useDeleteAccount(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const db = await getAdapter();
      await db.deleteAccount(id);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

// ============================================================
// Budget Hooks
// ============================================================

export function useBudgets(): UseQueryResult<Budget[], Error> {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: async () => {
      const db = await getAdapter();
      return db.getAllBudgets();
    },
  });
}

export function useActiveBudgets(): UseQueryResult<Budget[], Error> {
  return useQuery({
    queryKey: [...queryKeys.budgets, "active"],
    queryFn: async () => {
      const db = await getAdapter();
      const budgets = await db.getAllBudgets();
      return budgets.filter((b) => b.isActive);
    },
  });
}

export function useAddBudget(): UseMutationResult<
  void,
  Error,
  Omit<Budget, "id" | "createdAt" | "spent">
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const db = await getAdapter();
      const now = new Date().toISOString();
      const budget: Budget = {
        ...data,
        id: `budget_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        spent: 0,
        createdAt: now,
        updatedAt: now,
      };
      await db.addBudget(budget);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
}

export function useUpdateBudget(): UseMutationResult<
  void,
  Error,
  { id: string; data: Partial<Budget> }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const db = await getAdapter();
      await db.updateBudget(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
}

export function useDeleteBudget(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const db = await getAdapter();
      await db.deleteBudget(id);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
}

// ============================================================
// Recurring Transaction Hooks
// ============================================================

export function useRecurring(): UseQueryResult<RecurringTransaction[], Error> {
  return useQuery({
    queryKey: queryKeys.recurring,
    queryFn: async () => {
      const db = await getAdapter();
      return db.getAllRecurring();
    },
  });
}

export function useActiveRecurring(): UseQueryResult<
  RecurringTransaction[],
  Error
> {
  return useQuery({
    queryKey: [...queryKeys.recurring, "active"],
    queryFn: async () => {
      const db = await getAdapter();
      const recurring = await db.getAllRecurring();
      return recurring.filter((r) => r.isActive);
    },
  });
}

export function useAddRecurring(): UseMutationResult<
  void,
  Error,
  Omit<RecurringTransaction, "id" | "createdAt" | "lastProcessed">
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const db = await getAdapter();
      const now = new Date().toISOString();
      const recurring: RecurringTransaction = {
        ...data,
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        lastProcessed: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.addRecurring(recurring);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.recurring });
    },
  });
}

export function useUpdateRecurring(): UseMutationResult<
  void,
  Error,
  { id: string; data: Partial<RecurringTransaction> }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const db = await getAdapter();
      await db.updateRecurring(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.recurring });
    },
  });
}

export function useDeleteRecurring(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const db = await getAdapter();
      await db.deleteRecurring(id);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.recurring });
    },
  });
}

// ============================================================
// Utility Hooks
// ============================================================

// Hook to invalidate all data (useful after bulk imports)
export function useInvalidateAll() {
  const client = useQueryClient();

  return () => {
    client.invalidateQueries({ queryKey: queryKeys.transactions });
    client.invalidateQueries({ queryKey: queryKeys.accounts });
    client.invalidateQueries({ queryKey: queryKeys.budgets });
    client.invalidateQueries({ queryKey: queryKeys.recurring });
  };
}

// Hook to prefetch all data on app load
export function usePrefetchAllData() {
  const client = useQueryClient();

  return async () => {
    await Promise.all([
      client.prefetchQuery({
        queryKey: queryKeys.transactions,
        queryFn: async () => {
          const db = await getAdapter();
          return db.getAll();
        },
      }),
      client.prefetchQuery({
        queryKey: queryKeys.accounts,
        queryFn: async () => {
          const db = await getAdapter();
          return db.getAllAccounts();
        },
      }),
      client.prefetchQuery({
        queryKey: queryKeys.budgets,
        queryFn: async () => {
          const db = await getAdapter();
          return db.getAllBudgets();
        },
      }),
      client.prefetchQuery({
        queryKey: queryKeys.recurring,
        queryFn: async () => {
          const db = await getAdapter();
          return db.getAllRecurring();
        },
      }),
    ]);
  };
}
