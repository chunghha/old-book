import {
  StorageAdapter,
  Transaction,
  Account,
  Budget,
  RecurringTransaction,
  PaymentMethod,
  ReceiptStatus,
  TransactionStatus,
  AccountType,
  BudgetPeriod,
  RecurringFrequency,
} from "./types";

const STORAGE_KEYS = {
  transactions: "bk:transactions:v2",
  accounts: "bk:accounts:v1",
  budgets: "bk:budgets:v1",
  recurring: "bk:recurring:v1",
} as const;

export class LocalStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {
    // Migrate old transactions to new format if needed
    this.migrateTransactions();
    return Promise.resolve();
  }

  private migrateTransactions(): void {
    try {
      // Check for old key and migrate
      const oldKey = "bk:transactions:v1";
      const oldData = localStorage.getItem(oldKey);
      const newData = localStorage.getItem(STORAGE_KEYS.transactions);

      if (oldData && !newData) {
        const txs = JSON.parse(oldData) as any[];
        const migrated = txs.map((tx) => ({
          ...tx,
          payee: tx.payee || tx.description || "",
          method: tx.method || "card",
          receiptStatus: tx.receiptStatus || "missing",
          status: tx.status || "pending",
        }));
        localStorage.setItem(
          STORAGE_KEYS.transactions,
          JSON.stringify(migrated),
        );
        localStorage.removeItem(oldKey);
      }
    } catch {
      // Ignore migration errors
    }
  }

  // ==================== TRANSACTIONS ====================

  async getAll(): Promise<Transaction[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.transactions);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as any[];

      return parsed.map((item) => this.normalizeTransaction(item));
    } catch {
      return [];
    }
  }

  private normalizeTransaction(item: any): Transaction {
    return {
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
      recurringId: item.recurringId || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || undefined,
    };
  }

  private async saveTransactions(txs: Transaction[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(txs));
  }

  async add(tx: Transaction): Promise<void> {
    const current = await this.getAll();

    const normalized: Transaction = {
      ...tx,
      payee: tx.payee || tx.description || "",
      method: tx.method || "card",
      receiptStatus: tx.receiptStatus || "missing",
      status: tx.status || "pending",
    };

    await this.saveTransactions([normalized, ...current]);
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
    await this.saveTransactions(current);
  }

  async delete(id: string): Promise<void> {
    const current = await this.getAll();
    await this.saveTransactions(current.filter((t) => t.id !== id));
  }

  async bulkDelete(ids: string[]): Promise<void> {
    const current = await this.getAll();
    const idSet = new Set(ids);
    await this.saveTransactions(current.filter((t) => !idSet.has(t.id)));
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.transactions);
  }

  async import(txs: Transaction[]): Promise<void> {
    const current = await this.getAll();

    const normalized = txs.map((tx) => ({
      ...tx,
      payee: tx.payee || tx.description || "",
      method: tx.method || "card",
      receiptStatus: tx.receiptStatus || "missing",
      status: tx.status || "pending",
    }));

    await this.saveTransactions([...normalized, ...current]);
  }

  // ==================== ACCOUNTS ====================

  async getAllAccounts(): Promise<Account[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.accounts);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as any[];
      return parsed.map((item) => this.normalizeAccount(item));
    } catch {
      return [];
    }
  }

  private normalizeAccount(item: any): Account {
    return {
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      type: (item.type as AccountType) || "checking",
      institution: item.institution || undefined,
      lastFour: item.lastFour || undefined,
      balance: Number(item.balance) || 0,
      currency: item.currency || "USD",
      color: item.color || "#6366f1",
      isActive: item.isActive !== false,
      isPrimary: item.isPrimary === true,
      creditLimit: item.creditLimit ? Number(item.creditLimit) : undefined,
      interestRate: item.interestRate ? Number(item.interestRate) : undefined,
      note: item.note || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || undefined,
    };
  }

  private async saveAccounts(accounts: Account[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
  }

  async addAccount(account: Account): Promise<void> {
    const current = await this.getAllAccounts();
    await this.saveAccounts([account, ...current]);
  }

  async updateAccount(id: string, patch: Partial<Account>): Promise<void> {
    const current = await this.getAllAccounts();
    const idx = current.findIndex((a) => a.id === id);
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.saveAccounts(current);
  }

  async deleteAccount(id: string): Promise<void> {
    const current = await this.getAllAccounts();
    await this.saveAccounts(current.filter((a) => a.id !== id));
  }

  // ==================== BUDGETS ====================

  async getAllBudgets(): Promise<Budget[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.budgets);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as any[];
      return parsed.map((item) => this.normalizeBudget(item));
    } catch {
      return [];
    }
  }

  private normalizeBudget(item: any): Budget {
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      amount: Number(item.amount) || 0,
      spent: Number(item.spent) || 0,
      period: (item.period as BudgetPeriod) || "monthly",
      color: item.color || "#6366f1",
      icon: item.icon || undefined,
      isActive: item.isActive !== false,
      rollover: item.rollover === true,
      alertThreshold: Number(item.alertThreshold) || 80,
      note: item.note || undefined,
      startDate: item.startDate || undefined,
      endDate: item.endDate || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || undefined,
    };
  }

  private async saveBudgets(budgets: Budget[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
  }

  async addBudget(budget: Budget): Promise<void> {
    const current = await this.getAllBudgets();
    await this.saveBudgets([budget, ...current]);
  }

  async updateBudget(id: string, patch: Partial<Budget>): Promise<void> {
    const current = await this.getAllBudgets();
    const idx = current.findIndex((b) => b.id === id);
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.saveBudgets(current);
  }

  async deleteBudget(id: string): Promise<void> {
    const current = await this.getAllBudgets();
    await this.saveBudgets(current.filter((b) => b.id !== id));
  }

  // ==================== RECURRING TRANSACTIONS ====================

  async getAllRecurring(): Promise<RecurringTransaction[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.recurring);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as any[];
      return parsed.map((item) => this.normalizeRecurring(item));
    } catch {
      return [];
    }
  }

  private normalizeRecurring(item: any): RecurringTransaction {
    return {
      id: item.id,
      name: item.name,
      payee: item.payee,
      description: item.description || undefined,
      amount: Number(item.amount) || 0,
      type: item.type as "credit" | "debit",
      category: item.category,
      account: item.account,
      destinationAccount: item.destinationAccount || undefined,
      method: (item.method as PaymentMethod) || "card",
      frequency: (item.frequency as RecurringFrequency) || "monthly",
      dayOfMonth: item.dayOfMonth ? Number(item.dayOfMonth) : undefined,
      dayOfWeek: item.dayOfWeek ? Number(item.dayOfWeek) : undefined,
      monthOfYear: item.monthOfYear ? Number(item.monthOfYear) : undefined,
      startDate: item.startDate,
      endDate: item.endDate || null,
      nextDue: item.nextDue || null,
      lastProcessed: item.lastProcessed || null,
      isActive: item.isActive !== false,
      autoProcess: item.autoProcess === true,
      variableAmount: item.variableAmount === true,
      tags: Array.isArray(item.tags) ? item.tags : [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || undefined,
    };
  }

  private async saveRecurring(
    recurring: RecurringTransaction[],
  ): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.recurring, JSON.stringify(recurring));
  }

  async addRecurring(recurring: RecurringTransaction): Promise<void> {
    const current = await this.getAllRecurring();
    await this.saveRecurring([recurring, ...current]);
  }

  async updateRecurring(
    id: string,
    patch: Partial<RecurringTransaction>,
  ): Promise<void> {
    const current = await this.getAllRecurring();
    const idx = current.findIndex((r) => r.id === id);
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.saveRecurring(current);
  }

  async deleteRecurring(id: string): Promise<void> {
    const current = await this.getAllRecurring();
    await this.saveRecurring(current.filter((r) => r.id !== id));
  }
}
