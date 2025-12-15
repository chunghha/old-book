import {
  StorageAdapter,
  Transaction,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
} from "./types";

const STORAGE_KEY = "bk:transactions:v1";

export class LocalStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {
    // Migrate old transactions to include new fields
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const txs = JSON.parse(raw) as any[];
        const migrated = txs.map((tx) => ({
          ...tx,
          payee: tx.payee || tx.description || "",
          method: tx.method || "card",
          receiptStatus: tx.receiptStatus || "missing",
          status: tx.status || "pending",
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch {
      // Ignore migration errors
    }
    return Promise.resolve();
  }

  async getAll(): Promise<Transaction[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as any[];

      // Normalize and validate each transaction
      return parsed.map((item) => ({
        id: item.id,
        date: item.date,
        amount: Number(item.amount),
        type: item.type as "credit" | "debit",
        payee: item.payee || undefined,
        description: item.description || undefined,
        account: item.account || undefined,
        category: item.category || undefined,
        tags: Array.isArray(item.tags) ? item.tags : [],
        method: (item.method as PaymentMethod) || undefined,
        receiptStatus: (item.receiptStatus as ReceiptStatus) || "missing",
        status: (item.status as TransactionStatus) || "pending",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt || undefined,
      }));
    } catch {
      return [];
    }
  }

  private async save(txs: Transaction[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  }

  async add(tx: Transaction): Promise<void> {
    const current = await this.getAll();

    // Ensure new fields have defaults
    const normalized: Transaction = {
      ...tx,
      payee: tx.payee || tx.description || "",
      method: tx.method || "card",
      receiptStatus: tx.receiptStatus || "missing",
      status: tx.status || "pending",
    };

    await this.save([normalized, ...current]);
  }

  async update(id: string, patch: Partial<Transaction>): Promise<void> {
    const current = await this.getAll();
    const idx = current.findIndex((t) => t.id === id);
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.save(current);
  }

  async delete(id: string): Promise<void> {
    const current = await this.getAll();
    await this.save(current.filter((t) => t.id !== id));
  }

  async bulkDelete(ids: string[]): Promise<void> {
    const current = await this.getAll();
    const idSet = new Set(ids);
    await this.save(current.filter((t) => !idSet.has(t.id)));
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  async import(txs: Transaction[]): Promise<void> {
    const current = await this.getAll();

    // Normalize imported transactions
    const normalized = txs.map((tx) => ({
      ...tx,
      payee: tx.payee || tx.description || "",
      method: tx.method || "card",
      receiptStatus: tx.receiptStatus || "missing",
      status: tx.status || "pending",
    }));

    // Prepend new imports
    await this.save([...normalized, ...current]);
  }
}
