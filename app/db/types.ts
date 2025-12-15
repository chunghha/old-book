export type TransactionType = "credit" | "debit";

export type PaymentMethod =
  | "card"
  | "wire"
  | "ach"
  | "transfer"
  | "incoming"
  | "check"
  | "cash";

export type ReceiptStatus = "attached" | "missing" | "n/a";

export type TransactionStatus = "done" | "pending" | "review";

export interface Transaction {
  id: string;
  date: string; // ISO date string
  amount: number;
  type: TransactionType;

  // Payee / Description
  payee?: string; // To / From field
  description?: string;

  // Account & Categorization
  account?: string;
  category?: string;
  tags?: string[];

  // Payment Details
  method?: PaymentMethod;
  receiptStatus?: ReceiptStatus;
  status?: TransactionStatus;

  // Metadata
  createdAt: string;
  updatedAt?: string;
}

// Helper type for chart data aggregation
export interface DailyAggregate {
  date: string;
  inflow: number; // credits
  outflow: number; // debits
  net: number;
}

// Category breakdown for pie/bar charts
export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
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
