import { create } from "zustand";

/**
 * Transactions store with local persistence.
 *
 * - Uses Zustand for a compact store API
 * - Persists to localStorage under `bk:transactions:v1`
 * - Provides CRUD ops, selection, simple filters, import/export helpers
 *
 * Note: This file is intentionally dependency-light so it works in a demo
 * environment. If you add Dexie / IndexedDB later, you can swap persistence.
 */

/* ----------------------------- Types ------------------------------------ */

export type TransactionType = "credit" | "debit";

export interface Transaction {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD or full ISO)
  amount: number; // positive numbers; sign semantics handled by `type`
  type: TransactionType;
  description?: string;
  account?: string;
  category?: string;
  tags?: string[];
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

export interface TransactionFilters {
  q?: string; // full-text search on description, category, tags
  account?: string;
  category?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  type?: TransactionType | "all";
}

/* --------------------------- Persistence -------------------------------- */

const STORAGE_KEY = "bk:transactions:v1";

/** Simple deterministic ID generator (timestamp + random) */
function genId(prefix = "tx") {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${t}_${r}`;
}

/** Safe JSON parse */
function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** Seed sample transactions used when no persisted data exists */
function sampleTransactions(): Transaction[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  return [
    {
      id: genId(),
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 40)), // ~40 days ago
      amount: 2500,
      type: "credit",
      description: "Salary",
      account: "Checking",
      category: "Income",
      tags: ["payroll"],
      createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 40)),
    },
    {
      id: genId(),
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10)), // ~10 days ago
      amount: 76.42,
      type: "debit",
      description: "Groceries - Market",
      account: "Checking",
      category: "Groceries",
      tags: ["food"],
      createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10)),
    },
    {
      id: genId(),
      date: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)), // 2 days ago
      amount: 14.99,
      type: "debit",
      description: "Streaming Service",
      account: "Credit Card",
      category: "Subscriptions",
      tags: ["entertainment"],
      createdAt: iso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
    },
  ];
}

/** Load persisted transactions or seed */
function loadPersistedTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleTransactions();
    const parsed = safeParse<Transaction[]>(raw, []);
    // Validate shape minimally
    if (!Array.isArray(parsed) || parsed.length === 0)
      return parsed.length ? parsed : sampleTransactions();
    return parsed;
  } catch {
    return sampleTransactions();
  }
}

/* ---------------------------- Zustand Store ------------------------------ */

interface TransactionsState {
  transactions: Transaction[];
  selectedIds: string[];
  filters: TransactionFilters;
  // derived
  getBalance: () => number;
  // actions
  addTransaction: (
    payload: Omit<Partial<Transaction>, "id" | "createdAt" | "updatedAt"> & {
      amount: number;
      type: TransactionType;
    },
  ) => Transaction;
  updateTransaction: (
    id: string,
    patch: Partial<Transaction>,
  ) => Transaction | null;
  deleteTransaction: (id: string) => boolean;
  bulkDelete: (ids: string[]) => number;
  setTransactions: (txs: Transaction[]) => void;
  importJSON: (json: string) => { added: number; errors?: number };
  exportJSON: () => string;
  exportCSV: () => string;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setFilters: (f: TransactionFilters) => void;
  clearFilters: () => void;
  filtered: () => Transaction[];
  findById: (id: string) => Transaction | undefined;
  clearAll: () => void;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => {
  const initial = loadPersistedTransactions();

  // persistence subscription: save transactions slice on change
  // We'll subscribe after creation below.

  return {
    transactions: initial,
    selectedIds: [],
    filters: { type: "all" },

    getBalance: () => {
      const txs = get().transactions;
      return txs.reduce((acc, t) => {
        const signed = t.type === "credit" ? t.amount : -t.amount;
        return acc + signed;
      }, 0);
    },

    addTransaction: (payload) => {
      const now = new Date().toISOString();
      const tx: Transaction = {
        id: genId(),
        date: payload.date ?? now,
        amount: Number(payload.amount ?? 0),
        type: payload.type,
        description: payload.description ?? "",
        account: payload.account ?? "Default",
        category: payload.category ?? "Uncategorized",
        tags: payload.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ transactions: [tx, ...s.transactions] }));
      return tx;
    },

    updateTransaction: (id, patch) => {
      let updated: Transaction | null = null;
      set((s) => {
        const idx = s.transactions.findIndex((t) => t.id === id);
        if (idx === -1) return {};
        const base = s.transactions[idx];
        const merged: Transaction = {
          ...base,
          ...patch,
          amount:
            patch.amount !== undefined ? Number(patch.amount) : base.amount,
          updatedAt: new Date().toISOString(),
        };
        const copy = s.transactions.slice();
        copy[idx] = merged;
        updated = merged;
        return { transactions: copy };
      });
      return updated;
    },

    deleteTransaction: (id) => {
      let removed = false;
      set((s) => {
        const next = s.transactions.filter((t) => t.id !== id);
        removed = next.length !== s.transactions.length;
        return {
          transactions: next,
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
        };
      });
      return removed;
    },

    bulkDelete: (ids) => {
      let removed = 0;
      set((s) => {
        const idSet = new Set(ids);
        const next = s.transactions.filter((t) => {
          if (idSet.has(t.id)) {
            removed++;
            return false;
          }
          return true;
        });
        return {
          transactions: next,
          selectedIds: s.selectedIds.filter((sid) => !idSet.has(sid)),
        };
      });
      return removed;
    },

    setTransactions: (txs) => {
      set(() => ({ transactions: txs.slice() }));
    },

    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) return { added: 0, errors: 1 };
        let added = 0;
        const toAdd: Transaction[] = [];
        for (const item of parsed) {
          // minimal validation
          if (!item || typeof item.amount !== "number") continue;
          const now = new Date().toISOString();
          const tx: Transaction = {
            id: typeof item.id === "string" ? item.id : genId(),
            date: item.date ?? now,
            amount: Number(item.amount),
            type: item.type === "credit" ? "credit" : "debit",
            description: item.description ?? "",
            account: item.account ?? "Imported",
            category: item.category ?? "Imported",
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            createdAt: item.createdAt ?? now,
            updatedAt: item.updatedAt ?? now,
          };
          toAdd.push(tx);
          added++;
        }
        if (toAdd.length) {
          set((s) => ({ transactions: [...toAdd, ...s.transactions] }));
        }
        return { added };
      } catch {
        return { added: 0, errors: 1 };
      }
    },

    exportJSON: () => {
      const txs = get().transactions;
      return JSON.stringify(txs, null, 2);
    },

    exportCSV: () => {
      const txs = get().transactions;
      const headers = [
        "id",
        "date",
        "type",
        "amount",
        "description",
        "account",
        "category",
        "tags",
        "createdAt",
        "updatedAt",
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

    toggleSelect: (id) => {
      set((s) => {
        const exists = s.selectedIds.includes(id);
        const next = exists
          ? s.selectedIds.filter((x) => x !== id)
          : [...s.selectedIds, id];
        return { selectedIds: next };
      });
    },

    clearSelection: () => {
      set(() => ({ selectedIds: [] }));
    },

    setFilters: (f) => {
      set(() => ({ filters: { ...(f || {}) } }));
    },

    clearFilters: () => {
      set(() => ({ filters: { type: "all" } }));
    },

    filtered: () => {
      const s = get();
      const txs = s.transactions;
      const f = s.filters || {};
      return txs.filter((t) => {
        if (f.type && f.type !== "all" && t.type !== f.type) return false;
        if (f.account && t.account !== f.account) return false;
        if (f.category && t.category !== f.category) return false;
        if (f.from && new Date(t.date) < new Date(f.from)) return false;
        if (f.to && new Date(t.date) > new Date(f.to)) return false;
        if (f.q) {
          const q = f.q.toLowerCase();
          const hay =
            `${t.description ?? ""} ${t.category ?? ""} ${t.account ?? ""} ${((t.tags || []) as string[]).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },

    findById: (id) => {
      return get().transactions.find((t) => t.id === id);
    },

    clearAll: () => {
      set(() => ({ transactions: [], selectedIds: [] }));
    },
  };
});

/* ------------------------- Persist subscription -------------------------- */
/**
 * Subscribe to transactions slice and persist to localStorage.
 * We use a shallow comparison approach by serializing on change.
 */
(function setupPersistence() {
  try {
    // Subscribe to only the transactions array changes.
    let last = JSON.stringify(useTransactionsStore.getState().transactions);
    useTransactionsStore.subscribe(
      (s) => s.transactions,
      (transactions) => {
        try {
          const cur = JSON.stringify(transactions);
          if (cur === last) return;
          last = cur;
          localStorage.setItem(STORAGE_KEY, cur);
        } catch {
          // ignore persistence errors
        }
      },
    );
  } catch {
    // No-op if localStorage is unavailable
  }
})();

/* ----------------------------- Helpers ---------------------------------- */

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

/* ----------------------------- Exports ---------------------------------- */

export default useTransactionsStore;
