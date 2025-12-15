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

/**
 * Small runtime-only DOM toast used in development to notify test-data import.
 * Uses direct DOM APIs so it can be called from non-React code (stores).
 */
function showDevToast(message: string, duration = 4000) {
  if (typeof window === "undefined" || !document?.body) return;
  try {
    const id = `bk-dev-toast-${Date.now()}`;
    const container = document.createElement("div");
    container.id = id;
    container.style.position = "fixed";
    container.style.right = "16px";
    container.style.bottom = "16px";
    container.style.zIndex = "9999";
    container.style.background = "rgba(17,24,39,0.95)";
    container.style.color = "#fff";
    container.style.padding = "10px 14px";
    container.style.borderRadius = "8px";
    container.style.boxShadow = "0 10px 30px rgba(2,6,23,0.6)";
    container.style.fontSize = "14px";
    container.style.maxWidth = "320px";
    container.style.pointerEvents = "auto";
    container.style.lineHeight = "1.2";
    container.textContent = message;

    document.body.appendChild(container);

    // Fade out after duration
    setTimeout(() => {
      try {
        container.style.transition = "opacity 220ms ease";
        container.style.opacity = "0";
        setTimeout(() => {
          if (container.parentNode) container.parentNode.removeChild(container);
        }, 220);
      } catch {
        if (container.parentNode) container.parentNode.removeChild(container);
      }
    }, duration);
  } catch {
    // swallow any errors - this is a best-effort dev notification
  }
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
        let txs = await db.getAll();

        // Detect development mode (Vite / NODE env heuristics)
        const isDev =
          typeof window !== "undefined" &&
          ((typeof import.meta !== "undefined" &&
            (import.meta as any).env &&
            (import.meta as any).env.DEV) ||
            process.env.NODE_ENV === "development");

        // If DB is empty and we're in dev, attempt to auto-import test-data/transactions.json
        if ((txs.length === 0 || txs.length === undefined) && isDev) {
          try {
            const resp = await fetch("/test-data/transactions.json");
            if (resp.ok) {
              const data = await resp.json();
              // import directly to DB using adapter method
              await db.import(data);
              txs = await db.getAll();
              console.info(
                `Imported ${Array.isArray(data) ? data.length : 0} test transactions`,
              );
              try {
                showDevToast(
                  `Imported ${Array.isArray(data) ? data.length : 0} test transactions`,
                );
              } catch {
                // ignore toast errors
              }
            }
          } catch (e) {
            console.warn("Failed to auto-import test transactions:", e);
          }
        }

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
