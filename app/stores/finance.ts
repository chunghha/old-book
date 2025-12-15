import { create } from "zustand";
import { getDatabase } from "../db";
import {
  Account,
  AccountType,
  Budget,
  BudgetPeriod,
  RecurringTransaction,
  RecurringFrequency,
  Transaction,
  TransactionType,
  PaymentMethod,
  BudgetProgress,
  AccountSummary,
  UpcomingRecurring,
} from "../db/types";

export type {
  Account,
  AccountType,
  Budget,
  BudgetPeriod,
  RecurringTransaction,
  RecurringFrequency,
  BudgetProgress,
  AccountSummary,
  UpcomingRecurring,
};

/** Simple deterministic ID generator */
function genId(prefix = "id") {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${t}_${r}`;
}

/** Calculate next due date for a recurring transaction */
function calculateNextDue(
  frequency: RecurringFrequency,
  lastDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: number,
  monthOfYear?: number,
): Date {
  const next = new Date(lastDate);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
      }
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      if (dayOfMonth) {
        next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
      }
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      if (monthOfYear) {
        next.setMonth(monthOfYear - 1);
      }
      if (dayOfMonth) {
        next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
      }
      break;
  }

  return next;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDaysRemaining(period: BudgetPeriod): number {
  const now = new Date();
  const end = new Date();

  switch (period) {
    case "weekly":
      const dayOfWeek = now.getDay();
      end.setDate(now.getDate() + (6 - dayOfWeek));
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case "quarterly":
      const quarter = Math.floor(now.getMonth() / 3);
      end.setMonth((quarter + 1) * 3, 0);
      break;
    case "yearly":
      end.setFullYear(end.getFullYear(), 11, 31);
      break;
  }

  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

interface FinanceState {
  // Data
  accounts: Account[];
  budgets: Budget[];
  recurring: RecurringTransaction[];

  // Loading states
  isLoadingAccounts: boolean;
  isLoadingBudgets: boolean;
  isLoadingRecurring: boolean;

  // Account Actions
  initAccounts: () => Promise<void>;
  addAccount: (
    data: Omit<Account, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getAccountByDisplayName: (displayName: string) => Account | undefined;

  // Budget Actions
  initBudgets: () => Promise<void>;
  addBudget: (
    data: Omit<Budget, "id" | "createdAt" | "updatedAt" | "spent">,
  ) => Promise<void>;
  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  updateBudgetSpending: (category: string, amount: number) => Promise<void>;
  resetBudgetSpending: (period?: BudgetPeriod) => Promise<void>;

  // Recurring Actions
  initRecurring: () => Promise<void>;
  addRecurring: (
    data: Omit<
      RecurringTransaction,
      "id" | "createdAt" | "updatedAt" | "nextDue" | "lastProcessed"
    >,
  ) => Promise<void>;
  updateRecurring: (
    id: string,
    data: Partial<RecurringTransaction>,
  ) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  processRecurring: (
    id: string,
  ) => Promise<Omit<Transaction, "id" | "createdAt"> | null>;
  skipRecurring: (id: string) => Promise<void>;

  // Computed / Getters
  getAccountSummary: () => AccountSummary;
  getBudgetProgress: () => BudgetProgress[];
  getUpcomingRecurring: (days?: number) => UpcomingRecurring[];
  getOverdueBudgets: () => Budget[];
  getActiveAccounts: () => Account[];
  getActiveBudgets: () => Budget[];
  getActiveRecurring: () => RecurringTransaction[];

  // Import / Export
  importAccounts: (accounts: Account[]) => Promise<number>;
  importBudgets: (budgets: Budget[]) => Promise<number>;
  importRecurring: (recurring: RecurringTransaction[]) => Promise<number>;
  exportAccounts: () => string;
  exportBudgets: () => string;
  exportRecurring: () => string;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  budgets: [],
  recurring: [],
  isLoadingAccounts: true,
  isLoadingBudgets: true,
  isLoadingRecurring: true,

  // ==================== ACCOUNTS ====================

  initAccounts: async () => {
    set({ isLoadingAccounts: true });
    try {
      const db = await getDatabase();
      const accounts = await db.getAllAccounts();
      set({ accounts, isLoadingAccounts: false });
    } catch (err) {
      console.error("Failed to load accounts", err);
      set({ isLoadingAccounts: false });
    }
  },

  addAccount: async (data) => {
    const now = new Date().toISOString();
    const account: Account = {
      ...data,
      id: genId("acc"),
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    await db.addAccount(account);

    const accounts = await db.getAllAccounts();
    set({ accounts });
  },

  updateAccount: async (id, data) => {
    const db = await getDatabase();
    await db.updateAccount(id, data);

    const accounts = await db.getAllAccounts();
    set({ accounts });
  },

  deleteAccount: async (id) => {
    const db = await getDatabase();
    await db.deleteAccount(id);

    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
    }));
  },

  getAccountByDisplayName: (displayName) => {
    return get().accounts.find((a) => a.displayName === displayName);
  },

  // ==================== BUDGETS ====================

  initBudgets: async () => {
    set({ isLoadingBudgets: true });
    try {
      const db = await getDatabase();
      const budgets = await db.getAllBudgets();
      set({ budgets, isLoadingBudgets: false });
    } catch (err) {
      console.error("Failed to load budgets", err);
      set({ isLoadingBudgets: false });
    }
  },

  addBudget: async (data) => {
    const now = new Date().toISOString();
    const budget: Budget = {
      ...data,
      id: genId("budget"),
      spent: 0,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    await db.addBudget(budget);

    const budgets = await db.getAllBudgets();
    set({ budgets });
  },

  updateBudget: async (id, data) => {
    const db = await getDatabase();
    await db.updateBudget(id, data);

    const budgets = await db.getAllBudgets();
    set({ budgets });
  },

  deleteBudget: async (id) => {
    const db = await getDatabase();
    await db.deleteBudget(id);

    set((s) => ({
      budgets: s.budgets.filter((b) => b.id !== id),
    }));
  },

  updateBudgetSpending: async (category, amount) => {
    const budgets = get().budgets;
    const budget = budgets.find(
      (b) => b.category === category && b.isActive,
    );

    if (budget) {
      const db = await getDatabase();
      await db.updateBudget(budget.id, {
        spent: budget.spent + amount,
      });

      const updatedBudgets = await db.getAllBudgets();
      set({ budgets: updatedBudgets });
    }
  },

  resetBudgetSpending: async (period) => {
    const db = await getDatabase();
    const budgets = get().budgets;

    for (const budget of budgets) {
      if (!period || budget.period === period) {
        let newSpent = 0;

        // If rollover is enabled, carry over negative balance
        if (budget.rollover && budget.spent < budget.amount) {
          newSpent = budget.spent - budget.amount; // Will be negative (unused)
        }

        await db.updateBudget(budget.id, { spent: newSpent });
      }
    }

    const updatedBudgets = await db.getAllBudgets();
    set({ budgets: updatedBudgets });
  },

  // ==================== RECURRING ====================

  initRecurring: async () => {
    set({ isLoadingRecurring: true });
    try {
      const db = await getDatabase();
      const recurring = await db.getAllRecurring();
      set({ recurring, isLoadingRecurring: false });
    } catch (err) {
      console.error("Failed to load recurring transactions", err);
      set({ isLoadingRecurring: false });
    }
  },

  addRecurring: async (data) => {
    const now = new Date().toISOString();

    // Calculate initial next due date
    const startDate = new Date(data.startDate);
    let nextDue: string;

    if (startDate > new Date()) {
      nextDue = data.startDate;
    } else {
      const next = calculateNextDue(
        data.frequency,
        new Date(),
        data.dayOfMonth,
        data.dayOfWeek,
        data.monthOfYear,
      );
      nextDue = next.toISOString().slice(0, 10);
    }

    const recurring: RecurringTransaction = {
      ...data,
      id: genId("rec"),
      nextDue,
      lastProcessed: null,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    await db.addRecurring(recurring);

    const allRecurring = await db.getAllRecurring();
    set({ recurring: allRecurring });
  },

  updateRecurring: async (id, data) => {
    const db = await getDatabase();
    await db.updateRecurring(id, data);

    const recurring = await db.getAllRecurring();
    set({ recurring });
  },

  deleteRecurring: async (id) => {
    const db = await getDatabase();
    await db.deleteRecurring(id);

    set((s) => ({
      recurring: s.recurring.filter((r) => r.id !== id),
    }));
  },

  processRecurring: async (id) => {
    const recurring = get().recurring.find((r) => r.id === id);
    if (!recurring || !recurring.isActive) return null;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Create transaction data (caller will add to transactions store)
    const txData: Omit<Transaction, "id" | "createdAt"> = {
      date: today,
      amount: recurring.amount,
      type: recurring.type,
      payee: recurring.payee,
      description: recurring.description || recurring.name,
      account: recurring.account,
      category: recurring.category,
      method: recurring.method,
      tags: recurring.tags,
      receiptStatus: "n/a",
      status: "pending",
      recurringId: recurring.id,
    };

    // Calculate next due date
    const nextDue = calculateNextDue(
      recurring.frequency,
      now,
      recurring.dayOfMonth,
      recurring.dayOfWeek,
      recurring.monthOfYear,
    );

    // Check if recurring has ended
    let isActive = recurring.isActive;
    let nextDueStr: string | null = nextDue.toISOString().slice(0, 10);

    if (recurring.endDate && nextDue > new Date(recurring.endDate)) {
      isActive = false;
      nextDueStr = null;
    }

    // Update recurring transaction
    const db = await getDatabase();
    await db.updateRecurring(id, {
      lastProcessed: today,
      nextDue: nextDueStr,
      isActive,
    });

    const allRecurring = await db.getAllRecurring();
    set({ recurring: allRecurring });

    return txData;
  },

  skipRecurring: async (id) => {
    const recurring = get().recurring.find((r) => r.id === id);
    if (!recurring || !recurring.isActive) return;

    const now = new Date();

    // Calculate next due date
    const nextDue = calculateNextDue(
      recurring.frequency,
      now,
      recurring.dayOfMonth,
      recurring.dayOfWeek,
      recurring.monthOfYear,
    );

    // Check if recurring has ended
    let isActive = recurring.isActive;
    let nextDueStr: string | null = nextDue.toISOString().slice(0, 10);

    if (recurring.endDate && nextDue > new Date(recurring.endDate)) {
      isActive = false;
      nextDueStr = null;
    }

    const db = await getDatabase();
    await db.updateRecurring(id, {
      nextDue: nextDueStr,
      isActive,
    });

    const allRecurring = await db.getAllRecurring();
    set({ recurring: allRecurring });
  },

  // ==================== COMPUTED / GETTERS ====================

  getAccountSummary: () => {
    const accounts = get().accounts.filter((a) => a.isActive);

    let totalAssets = 0;
    let totalLiabilities = 0;

    const accountBalances = accounts.map((account) => {
      if (account.type === "credit") {
        // Credit cards: negative balance = liability
        if (account.balance < 0) {
          totalLiabilities += Math.abs(account.balance);
        } else {
          totalAssets += account.balance;
        }
      } else {
        // All other accounts: positive = asset
        if (account.balance >= 0) {
          totalAssets += account.balance;
        } else {
          totalLiabilities += Math.abs(account.balance);
        }
      }

      return { account, balance: account.balance };
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      accountBalances,
    };
  },

  getBudgetProgress: () => {
    const budgets = get().budgets.filter((b) => b.isActive);

    return budgets.map((budget) => {
      const percentage =
        budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
      const remaining = budget.amount - budget.spent;
      const isOverBudget = budget.spent > budget.amount;
      const daysRemaining = getDaysRemaining(budget.period);

      return {
        budget,
        percentage: Math.min(percentage, 100),
        remaining,
        isOverBudget,
        daysRemaining,
      };
    });
  },

  getUpcomingRecurring: (days = 7) => {
    const recurring = get().recurring.filter(
      (r) => r.isActive && r.nextDue,
    );
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const upcoming: UpcomingRecurring[] = [];

    for (const rec of recurring) {
      if (!rec.nextDue) continue;

      const dueDate = new Date(rec.nextDue);
      if (dueDate <= cutoff) {
        const diff = dueDate.getTime() - now.getTime();
        const daysUntilDue = Math.ceil(diff / (1000 * 60 * 60 * 24));

        upcoming.push({
          recurring: rec,
          dueDate: rec.nextDue,
          daysUntilDue: Math.max(0, daysUntilDue),
        });
      }
    }

    // Sort by due date
    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  },

  getOverdueBudgets: () => {
    return get().budgets.filter(
      (b) => b.isActive && b.spent > b.amount,
    );
  },

  getActiveAccounts: () => {
    return get().accounts.filter((a) => a.isActive);
  },

  getActiveBudgets: () => {
    return get().budgets.filter((b) => b.isActive);
  },

  getActiveRecurring: () => {
    return get().recurring.filter((r) => r.isActive);
  },

  // ==================== IMPORT / EXPORT ====================

  importAccounts: async (accounts) => {
    const db = await getDatabase();
    let added = 0;

    for (const account of accounts) {
      try {
        const normalized: Account = {
          id: account.id || genId("acc"),
          name: account.name,
          displayName: account.displayName,
          type: account.type || "checking",
          institution: account.institution,
          lastFour: account.lastFour,
          balance: Number(account.balance) || 0,
          currency: account.currency || "USD",
          color: account.color || "#6366f1",
          isActive: account.isActive !== false,
          isPrimary: account.isPrimary === true,
          creditLimit: account.creditLimit,
          interestRate: account.interestRate,
          note: account.note,
          createdAt: account.createdAt || new Date().toISOString(),
          updatedAt: account.updatedAt,
        };

        await db.addAccount(normalized);
        added++;
      } catch (err) {
        console.error("Failed to import account:", err);
      }
    }

    const allAccounts = await db.getAllAccounts();
    set({ accounts: allAccounts });

    return added;
  },

  importBudgets: async (budgets) => {
    const db = await getDatabase();
    let added = 0;

    for (const budget of budgets) {
      try {
        const normalized: Budget = {
          id: budget.id || genId("budget"),
          name: budget.name,
          category: budget.category,
          amount: Number(budget.amount) || 0,
          spent: Number(budget.spent) || 0,
          period: budget.period || "monthly",
          color: budget.color || "#6366f1",
          icon: budget.icon,
          isActive: budget.isActive !== false,
          rollover: budget.rollover === true,
          alertThreshold: Number(budget.alertThreshold) || 80,
          note: budget.note,
          startDate: budget.startDate,
          endDate: budget.endDate,
          createdAt: budget.createdAt || new Date().toISOString(),
          updatedAt: budget.updatedAt,
        };

        await db.addBudget(normalized);
        added++;
      } catch (err) {
        console.error("Failed to import budget:", err);
      }
    }

    const allBudgets = await db.getAllBudgets();
    set({ budgets: allBudgets });

    return added;
  },

  importRecurring: async (recurring) => {
    const db = await getDatabase();
    let added = 0;

    for (const rec of recurring) {
      try {
        const normalized: RecurringTransaction = {
          id: rec.id || genId("rec"),
          name: rec.name,
          payee: rec.payee,
          description: rec.description,
          amount: Number(rec.amount) || 0,
          type: rec.type || "debit",
          category: rec.category || "Uncategorized",
          account: rec.account || "Default",
          destinationAccount: rec.destinationAccount,
          method: rec.method || "card",
          frequency: rec.frequency || "monthly",
          dayOfMonth: rec.dayOfMonth,
          dayOfWeek: rec.dayOfWeek,
          monthOfYear: rec.monthOfYear,
          startDate: rec.startDate || new Date().toISOString().slice(0, 10),
          endDate: rec.endDate,
          nextDue: rec.nextDue,
          lastProcessed: rec.lastProcessed,
          isActive: rec.isActive !== false,
          autoProcess: rec.autoProcess === true,
          variableAmount: rec.variableAmount === true,
          tags: rec.tags || [],
          createdAt: rec.createdAt || new Date().toISOString(),
          updatedAt: rec.updatedAt,
        };

        await db.addRecurring(normalized);
        added++;
      } catch (err) {
        console.error("Failed to import recurring:", err);
      }
    }

    const allRecurring = await db.getAllRecurring();
    set({ recurring: allRecurring });

    return added;
  },

  exportAccounts: () => {
    return JSON.stringify(get().accounts, null, 2);
  },

  exportBudgets: () => {
    return JSON.stringify(get().budgets, null, 2);
  },

  exportRecurring: () => {
    return JSON.stringify(get().recurring, null, 2);
  },
}));

// Initialize all finance data
export async function initializeFinanceStore(): Promise<void> {
  const store = useFinanceStore.getState();
  await Promise.all([
    store.initAccounts(),
    store.initBudgets(),
    store.initRecurring(),
  ]);
}

// Helper to format currency
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// Helper to format percentage
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// Helper to get budget status color
export function getBudgetStatusColor(percentage: number): string {
  if (percentage >= 100) return "#ef4444"; // red
  if (percentage >= 80) return "#f97316"; // orange
  if (percentage >= 60) return "#eab308"; // yellow
  return "#22c55e"; // green
}

// Helper to get account type icon name
export function getAccountTypeIcon(type: AccountType): string {
  switch (type) {
    case "checking":
      return "building-2";
    case "savings":
      return "piggy-bank";
    case "credit":
      return "credit-card";
    case "investment":
      return "trending-up";
    case "cash":
      return "banknote";
    default:
      return "wallet";
  }
}

// Helper to get frequency label
export function getFrequencyLabel(frequency: RecurringFrequency): string {
  const labels: Record<RecurringFrequency, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };
  return labels[frequency] || frequency;
}

export default useFinanceStore;
