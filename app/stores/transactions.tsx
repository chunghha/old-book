import { create } from "zustand";
import { getDatabase } from "../db";
import { Transaction, TransactionType } from "../db/types";

export type { Transaction, TransactionType };

export interface TransactionFilters {
  q?: string;
  account?: string;
  category?: string;
  from?: string;
  to?: string;
  type?: TransactionType | "all";
}

interface TransactionsState {
  transactions: Transaction[];
  selectedIds: string[];
  filters: TransactionFilters;
  isLoading: boolean;

  // Actions
  init: () => Promise<void>;
  addTransaction: (
    payload: Omit<Partial<Transaction>, "id" | "createdAt" | "updatedAt"> & {
      amount: number;
      type: TransactionType;
    },
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  importJSON: (json: string) => Promise<{ added: number; errors?: number }>;

  // Sync Actions (UI state only)
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setFilters: (f: TransactionFilters) => void;
  clearFilters: () => void;

  // Getters / Exports
  exportJSON: () => string;
  exportCSV: () => string;
  filtered: () => Transaction[];
  getBalance: () => number;
  clearAll: () => Promise<void>;
}

/** Simple deterministic ID generator */
function genId(prefix = "tx") {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${t}_${r}`;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => {
  return {
    transactions: [],
    selectedIds: [],
    filters: { type: "all" },
    isLoading: true,

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

      const db = await getDatabase();
      await db.add(tx);

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

    clearSelection: () => set({ selectedIds: [] }),
    setFilters: (f) => set({ filters: f }),
    clearFilters: () => set({ filters: { type: "all" } }),

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
            `${t.description ?? ""} ${t.category ?? ""} ${t.account ?? ""} ${(t.tags || []).join(" ")}`.toLowerCase();
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

    exportJSON: () => JSON.stringify(get().transactions, null, 2),

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

export default useTransactionsStore;
