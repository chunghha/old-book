import { StorageAdapter, Transaction } from "./types";

const STORAGE_KEY = "bk:transactions:v1";

export class LocalStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {
    // No-op for local storage, data is always "ready"
    return Promise.resolve();
  }

  async getAll(): Promise<Transaction[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Transaction[];
    } catch {
      return [];
    }
  }

  private async save(txs: Transaction[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  }

  async add(tx: Transaction): Promise<void> {
    const current = await this.getAll();
    await this.save([tx, ...current]);
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
    // Prepend new imports
    await this.save([...txs, ...current]);
  }
}
