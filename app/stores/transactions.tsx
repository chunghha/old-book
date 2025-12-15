import { create } from "zustand";
import { getDatabase } from "../db";
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
  DailyAggregate,
  CategoryBreakdown,
} from "../db/types";

export type {
  Transaction,
  TransactionType,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
  DailyAggregate,
  CategoryBreakdown,
};

export interface TransactionFilters {
  q?: string;
  account?: string;
  category?: string;
  from?: string;
  to?: string;
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  method?: PaymentMethod | "all";
}

type TimeRange = "daily" | "weekly" | "monthly";

interface TransactionsState {
  transactions: Transaction[];
  selectedIds: string[];
  filters: TransactionFilters;
  isLoading: boolean;
  timeRange: TimeRange;

  // Actions
  init: () => Promise<void>;
  addTransaction: (
    payload: Omit<Partial<Transaction>, "id" | "createdAt" | "updatedAt"> & {
      amount: number;
      type: TransactionType;
    },
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    patch: Partial<Omit<Transaction, "id" | "createdAt">>,
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  importJSON: (json: string) => Promise<{ added: number; errors?: number }>;

  // Sync Actions (UI state only)
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setFilters: (f: TransactionFilters) => void;
  clearFilters: () => void;
  setTimeRange: (range: TimeRange) => void;

  // Getters / Exports
  exportJSON: () => string;
  exportCSV: () => string;
  filtered: () => Transaction[];
  getBalance: () => number;
  clearAll: () => Promise<void>;

  // Chart Data Computations
  getChartData: () => DailyAggregate[];
  getCategoryBreakdown: () => CategoryBreakdown[];
  getNetChange: () => number;
  getAccounts: () => string[];
  getCategories: () => string[];
}

/** Simple deterministic ID generator */
function genId(prefix = "tx") {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${t}_${r}`;
}

/** Category colors for charts */
const CATEGORY_COLORS = [
  "#22d3ee", // cyan
  "#3b82f6", // blue
  "#fcd34d", // yellow
  "#a855f7", // purple
  "#22c55e", // green
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
  "#84cc16", // lime
];

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/** Aggregate transactions by date */
function aggregateByDate(
  transactions: Transaction[],
  range: TimeRange,
): DailyAggregate[] {
  const aggregates = new Map<string, DailyAggregate>();

  for (const tx of transactions) {
    const date = new Date(tx.date);
    let key: string;

    if (range === "daily") {
      key = tx.date.slice(0, 10); // YYYY-MM-DD
    } else if (range === "weekly") {
      // Get start of week (Sunday)
      const day = date.getDay();
      const diff = date.getDate() - day;
      const weekStart = new Date(date.setDate(diff));
      key = weekStart.toISOString().slice(0, 10);
    } else {
      // Monthly
      key = tx.date.slice(0, 7); // YYYY-MM
    }

    const existing = aggregates.get(key) || {
      date: key,
      inflow: 0,
      outflow: 0,
      net: 0,
    };

    if (tx.type === "credit") {
      existing.inflow += tx.amount;
    } else {
      existing.outflow += tx.amount;
    }
    existing.net = existing.inflow - existing.outflow;

    aggregates.set(key, existing);
  }

  // Sort by date ascending
  return Array.from(aggregates.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/** Get category breakdown with percentages */
function computeCategoryBreakdown(
  transactions: Transaction[],
): CategoryBreakdown[] {
  const categoryTotals = new Map<string, { total: number; count: number }>();
  let grandTotal = 0;

  // Only count debits for expense categories
  for (const tx of transactions) {
    if (tx.type === "debit") {
      const cat = tx.category || "Uncategorized";
      const existing = categoryTotals.get(cat) || { total: 0, count: 0 };
      existing.total += tx.amount;
      existing.count += 1;
      categoryTotals.set(cat, existing);
      grandTotal += tx.amount;
    }
  }

  // Convert to array and sort by total descending
  const breakdown: CategoryBreakdown[] = [];
  let colorIndex = 0;

  for (const [category, data] of categoryTotals.entries()) {
    breakdown.push({
      category,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      color: getCategoryColor(colorIndex++),
    });
  }

  return breakdown.sort((a, b) => b.total - a.total);
}

export const useTransactionsStore = create<TransactionsState>((set, get) => {
  return {
    transactions: [],
    selectedIds: [],
    filters: { type: "all", status: "all", method: "all" },
    isLoading: true,
    timeRange: "daily",

    init: async () => {
      set({ isLoading: true });
      try {
        const db = await getDatabase();
        const txs = await db.getAll();
        set({ transactions: txs, isLoading: false });
      } catch (err) {
        console.error("Failed to load transactions", err);
        set({ isLoading: false });
      }
    },

    addTransaction: async (payload) => {
      const now = new Date().toISOString();
      const tx: Transaction = {
        id: genId(),
        date: payload.date ?? now.slice(0, 10),
        amount: Math.abs(Number(payload.amount ?? 0)),
        type: payload.type,
        payee: payload.payee ?? payload.description ?? "",
        description: payload.description ?? "",
        account: payload.account ?? "Default",
        category: payload.category ?? "Uncategorized",
        tags: payload.tags ?? [],
        method: payload.method ?? "card",
        receiptStatus: payload.receiptStatus ?? "missing",
        status: payload.status ?? "pending",
        createdAt: now,
        updatedAt: now,
      };

      const db = await getDatabase();
      await db.add(tx);

      // Reload to ensure sync
      const all = await db.getAll();
      set({ transactions: all });
    },

    updateTransaction: async (id, patch) => {
      const db = await getDatabase();
      await db.update(id, patch);

      // Reload to ensure sync
      const all = await db.getAll();
      set({ transactions: all });
    },

    deleteTransaction: async (id) => {
      const db = await getDatabase();
      await db.delete(id);

      set((s) => ({
        transactions: s.transactions.filter((t) => t.id !== id),
        selectedIds: s.selectedIds.filter((sid) => sid !== id),
      }));
    },

    bulkDelete: async (ids) => {
      const db = await getDatabase();
      await db.bulkDelete(ids);

      const idSet = new Set(ids);
      set((s) => ({
        transactions: s.transactions.filter((t) => !idSet.has(t.id)),
        selectedIds: s.selectedIds.filter((sid) => !idSet.has(sid)),
      }));
    },

    importJSON: async (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) return { added: 0, errors: 1 };

        const toAdd: Transaction[] = [];
        for (const item of parsed) {
          if (!item || typeof item.amount !== "number") continue;
          const now = new Date().toISOString();
          const tx: Transaction = {
            id: typeof item.id === "string" ? item.id : genId(),
            date: item.date ?? now.slice(0, 10),
            amount: Math.abs(Number(item.amount)),
            type: item.type === "credit" ? "credit" : "debit",
            payee: item.payee ?? item.description ?? "",
            description: item.description ?? "",
            account: item.account ?? "Imported",
            category: item.category ?? "Imported",
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            method: item.method ?? "card",
            receiptStatus: item.receiptStatus ?? "missing",
            status: item.status ?? "pending",
            createdAt: item.createdAt ?? now,
            updatedAt: item.updatedAt ?? now,
          };
          toAdd.push(tx);
        }

        if (toAdd.length > 0) {
          const db = await getDatabase();
          await db.import(toAdd);
          const all = await db.getAll();
          set({ transactions: all });
        }
        return { added: toAdd.length };
      } catch {
        return { added: 0, errors: 1 };
      }
    },

    clearAll: async () => {
      const db = await getDatabase();
      await db.clearAll();
      set({ transactions: [], selectedIds: [] });
    },

    // --- Sync / Derived ---

    toggleSelect: (id) => {
      set((s) => {
        const exists = s.selectedIds.includes(id);
        return {
          selectedIds: exists
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        };
      });
    },

    selectAll: (ids) => {
      set({ selectedIds: ids });
    },

    clearSelection: () => set({ selectedIds: [] }),
    setFilters: (f) => set({ filters: f }),
    clearFilters: () =>
      set({ filters: { type: "all", status: "all", method: "all" } }),
    setTimeRange: (range) => set({ timeRange: range }),

    filtered: () => {
      const s = get();
      const txs = s.transactions;
      const f = s.filters || {};

      return txs.filter((t) => {
        if (f.type && f.type !== "all" && t.type !== f.type) return false;
        if (f.status && f.status !== "all" && t.status !== f.status)
          return false;
        if (f.method && f.method !== "all" && t.method !== f.method)
          return false;
        if (f.account && t.account !== f.account) return false;
        if (f.category && t.category !== f.category) return false;
        if (f.from && new Date(t.date) < new Date(f.from)) return false;
        if (f.to && new Date(t.date) > new Date(f.to)) return false;

        if (f.q) {
          const q = f.q.toLowerCase();
          const hay =
            `${t.payee ?? ""} ${t.description ?? ""} ${t.category ?? ""} ${t.account ?? ""} ${(t.tags || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        return true;
      });
    },

    getBalance: () => {
      return get().transactions.reduce((acc, t) => {
        const signed = t.type === "credit" ? t.amount : -t.amount;
        return acc + signed;
      }, 0);
    },

    getNetChange: () => {
      const filtered = get().filtered();
      return filtered.reduce((acc, t) => {
        const signed = t.type === "credit" ? t.amount : -t.amount;
        return acc + signed;
      }, 0);
    },

    getChartData: () => {
      const s = get();
      const filtered = s.filtered();
      return aggregateByDate(filtered, s.timeRange);
    },

    getCategoryBreakdown: () => {
      const filtered = get().filtered();
      return computeCategoryBreakdown(filtered);
    },

    getAccounts: () => {
      const txs = get().transactions;
      const accounts = new Set<string>();
      for (const t of txs) {
        if (t.account) accounts.add(t.account);
      }
      return Array.from(accounts).sort();
    },

    getCategories: () => {
      const txs = get().transactions;
      const categories = new Set<string>();
      for (const t of txs) {
        if (t.category) categories.add(t.category);
      }
      return Array.from(categories).sort();
    },

    exportJSON: () => JSON.stringify(get().transactions, null, 2),

    exportCSV: () => {
      const txs = get().transactions;
      const headers = [
        "id",
        "date",
        "type",
        "amount",
        "payee",
        "description",
        "account",
        "category",
        "method",
        "receiptStatus",
        "status",
        "tags",
      ];

      const escape = (v: any) => {
        if (v == null) return "";
        const s = String(v);
        if (s.includes(",") || s.includes('"') || s.includes("\n"))
          return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const rows = txs.map((t) =>
        headers
          .map((h) => {
            if (h === "tags") return escape((t.tags || []).join("|"));
            // @ts-ignore
            return escape(t[h]);
          })
          .join(","),
      );

      return [headers.join(","), ...rows].join("\n");
    },
  };
});

// Initialize store immediately
useTransactionsStore.getState().init();

export function formatCurrency(n: number, locale = "en-US", currency = "USD") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function formatChartDate(dateStr: string, range: TimeRange): string {
  try {
    const date = new Date(dateStr);
    if (range === "monthly") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default useTransactionsStore;
