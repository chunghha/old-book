export type TransactionType = "credit" | "debit";

export interface Transaction {
  id: string;
  date: string; // ISO date string
  amount: number;
  type: TransactionType;
  description?: string;
  account?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface StorageAdapter {
  init(): Promise<void>;
  getAll(): Promise<Transaction[]>;
  add(tx: Transaction): Promise<void>;
  update(id: string, tx: Partial<Transaction>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  clearAll(): Promise<void>;
  import(txs: Transaction[]): Promise<void>;
}
