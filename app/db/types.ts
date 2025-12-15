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

export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "cash"
  | "other";

export type BudgetPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

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

  // Recurring reference (if generated from recurring)
  recurringId?: string;

  // Metadata
  createdAt: string;
  updatedAt?: string;
}

export interface Account {
  id: string;
  name: string;
  displayName: string; // e.g., "Chase ... 4521"
  type: AccountType;
  institution?: string;
  lastFour?: string;
  balance: number;
  currency: string;
  color: string;
  isActive: boolean;
  isPrimary: boolean;
  creditLimit?: number; // For credit accounts
  interestRate?: number; // For savings accounts
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  name: string;
  category: string; // Links to transaction category
  amount: number; // Budgeted amount
  spent: number; // Amount spent so far
  period: BudgetPeriod;
  color: string;
  icon?: string;
  isActive: boolean;
  rollover: boolean; // Carry over unused amount to next period
  alertThreshold: number; // Percentage (0-100) to trigger alert
  note?: string;
  startDate?: string; // When this budget starts
  endDate?: string; // When this budget ends (if applicable)
  createdAt: string;
  updatedAt?: string;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  payee: string;
  description?: string;
  amount: number;
  type: TransactionType;
  category: string;
  account: string;
  destinationAccount?: string; // For transfers
  method: PaymentMethod;
  frequency: RecurringFrequency;
  dayOfMonth?: number; // 1-31 for monthly/quarterly/yearly
  dayOfWeek?: number; // 0-6 for weekly/biweekly
  monthOfYear?: number; // 1-12 for yearly
  startDate: string;
  endDate?: string | null;
  nextDue: string | null;
  lastProcessed?: string | null;
  isActive: boolean;
  autoProcess: boolean; // Automatically create transaction on due date
  variableAmount?: boolean; // Amount may vary (e.g., utility bills)
  tags?: string[];
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

// Budget progress for display
export interface BudgetProgress {
  budget: Budget;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
  daysRemaining: number;
}

// Account summary for dashboard
export interface AccountSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountBalances: { account: Account; balance: number }[];
}

// Upcoming recurring transactions
export interface UpcomingRecurring {
  recurring: RecurringTransaction;
  dueDate: string;
  daysUntilDue: number;
}

export interface StorageAdapter {
  init(): Promise<void>;

  // Transactions
  getAll(): Promise<Transaction[]>;
  add(tx: Transaction): Promise<void>;
  update(id: string, tx: Partial<Transaction>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  clearAll(): Promise<void>;
  import(txs: Transaction[]): Promise<void>;

  // Accounts
  getAllAccounts(): Promise<Account[]>;
  addAccount(account: Account): Promise<void>;
  updateAccount(id: string, account: Partial<Account>): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  // Budgets
  getAllBudgets(): Promise<Budget[]>;
  addBudget(budget: Budget): Promise<void>;
  updateBudget(id: string, budget: Partial<Budget>): Promise<void>;
  deleteBudget(id: string): Promise<void>;

  // Recurring Transactions
  getAllRecurring(): Promise<RecurringTransaction[]>;
  addRecurring(recurring: RecurringTransaction): Promise<void>;
  updateRecurring(
    id: string,
    recurring: Partial<RecurringTransaction>,
  ): Promise<void>;
  deleteRecurring(id: string): Promise<void>;
}
