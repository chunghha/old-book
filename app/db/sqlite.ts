import Database from "@tauri-apps/plugin-sql";
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

export class SqliteAdapter implements StorageAdapter {
  private db: Database | null = null;

  async init(): Promise<void> {
    try {
      this.db = await Database.load("sqlite:book-keeper.db");

      // Create transactions table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          payee TEXT,
          description TEXT,
          account TEXT,
          category TEXT,
          tags TEXT,
          method TEXT,
          receipt_status TEXT,
          status TEXT DEFAULT 'pending',
          recurring_id TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);

      // Create accounts table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'checking',
          institution TEXT,
          last_four TEXT,
          balance REAL DEFAULT 0,
          currency TEXT DEFAULT 'USD',
          color TEXT DEFAULT '#6366f1',
          is_active INTEGER DEFAULT 1,
          is_primary INTEGER DEFAULT 0,
          credit_limit REAL,
          interest_rate REAL,
          note TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);

      // Create budgets table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS budgets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          amount REAL NOT NULL DEFAULT 0,
          spent REAL DEFAULT 0,
          period TEXT DEFAULT 'monthly',
          color TEXT DEFAULT '#6366f1',
          icon TEXT,
          is_active INTEGER DEFAULT 1,
          rollover INTEGER DEFAULT 0,
          alert_threshold INTEGER DEFAULT 80,
          note TEXT,
          start_date TEXT,
          end_date TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);

      // Create recurring transactions table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS recurring (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          payee TEXT NOT NULL,
          description TEXT,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          category TEXT,
          account TEXT,
          destination_account TEXT,
          method TEXT DEFAULT 'card',
          frequency TEXT DEFAULT 'monthly',
          day_of_month INTEGER,
          day_of_week INTEGER,
          month_of_year INTEGER,
          start_date TEXT NOT NULL,
          end_date TEXT,
          next_due TEXT,
          last_processed TEXT,
          is_active INTEGER DEFAULT 1,
          auto_process INTEGER DEFAULT 0,
          variable_amount INTEGER DEFAULT 0,
          tags TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);

      // Run migrations for any new columns
      await this.runMigrations();
    } catch (e) {
      console.error("Failed to init SQLite:", e);
      throw e;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    // Transaction migrations
    const txColumns = [
      { name: "payee", type: "TEXT" },
      { name: "method", type: "TEXT" },
      { name: "receipt_status", type: "TEXT" },
      { name: "status", type: "TEXT DEFAULT 'pending'" },
      { name: "recurring_id", type: "TEXT" },
    ];

    for (const col of txColumns) {
      try {
        await this.db.execute(
          `ALTER TABLE transactions ADD COLUMN ${col.name} ${col.type}`,
        );
      } catch {
        // Column likely already exists
      }
    }
  }

  // ==================== TRANSACTIONS ====================

  async getAll(): Promise<Transaction[]> {
    if (!this.db) throw new Error("DB not initialized");
    const rows = await this.db.select<any[]>(
      "SELECT * FROM transactions ORDER BY date DESC, created_at DESC",
    );

    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      type: row.type as "credit" | "debit",
      payee: row.payee || undefined,
      description: row.description || undefined,
      account: row.account || undefined,
      category: row.category || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      method: (row.method as PaymentMethod) || undefined,
      receiptStatus: (row.receipt_status as ReceiptStatus) || undefined,
      status: (row.status as TransactionStatus) || "pending",
      recurringId: row.recurring_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    }));
  }

  async add(tx: Transaction): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute(
      `INSERT INTO transactions (
        id, date, amount, type, payee, description, account, category,
        tags, method, receipt_status, status, recurring_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        tx.id,
        tx.date,
        tx.amount,
        tx.type,
        tx.payee || "",
        tx.description || "",
        tx.account || "",
        tx.category || "",
        JSON.stringify(tx.tags || []),
        tx.method || "",
        tx.receiptStatus || "missing",
        tx.status || "pending",
        tx.recurringId || "",
        tx.createdAt,
        tx.updatedAt || tx.createdAt,
      ],
    );
  }

  async update(id: string, tx: Partial<Transaction>): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (tx.date !== undefined) {
      fields.push(`date = $${paramIndex++}`);
      values.push(tx.date);
    }
    if (tx.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(tx.amount);
    }
    if (tx.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(tx.type);
    }
    if (tx.payee !== undefined) {
      fields.push(`payee = $${paramIndex++}`);
      values.push(tx.payee);
    }
    if (tx.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(tx.description);
    }
    if (tx.account !== undefined) {
      fields.push(`account = $${paramIndex++}`);
      values.push(tx.account);
    }
    if (tx.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(tx.category);
    }
    if (tx.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(tx.tags));
    }
    if (tx.method !== undefined) {
      fields.push(`method = $${paramIndex++}`);
      values.push(tx.method);
    }
    if (tx.receiptStatus !== undefined) {
      fields.push(`receipt_status = $${paramIndex++}`);
      values.push(tx.receiptStatus);
    }
    if (tx.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(tx.status);
    }
    if (tx.recurringId !== undefined) {
      fields.push(`recurring_id = $${paramIndex++}`);
      values.push(tx.recurringId);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(id);

    const query = `UPDATE transactions SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
    await this.db.execute(query, values);
  }

  async delete(id: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute("DELETE FROM transactions WHERE id = $1", [id]);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (ids.length === 0) return;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    await this.db.execute(
      `DELETE FROM transactions WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute("DELETE FROM transactions");
  }

  async import(txs: Transaction[]): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    for (const tx of txs) {
      await this.add(tx);
    }
  }

  // ==================== ACCOUNTS ====================

  async getAllAccounts(): Promise<Account[]> {
    if (!this.db) throw new Error("DB not initialized");
    const rows = await this.db.select<any[]>(
      "SELECT * FROM accounts ORDER BY is_primary DESC, name ASC",
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      type: (row.type as AccountType) || "checking",
      institution: row.institution || undefined,
      lastFour: row.last_four || undefined,
      balance: row.balance || 0,
      currency: row.currency || "USD",
      color: row.color || "#6366f1",
      isActive: row.is_active === 1,
      isPrimary: row.is_primary === 1,
      creditLimit: row.credit_limit || undefined,
      interestRate: row.interest_rate || undefined,
      note: row.note || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    }));
  }

  async addAccount(account: Account): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute(
      `INSERT INTO accounts (
        id, name, display_name, type, institution, last_four, balance,
        currency, color, is_active, is_primary, credit_limit, interest_rate,
        note, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        account.id,
        account.name,
        account.displayName,
        account.type,
        account.institution || "",
        account.lastFour || "",
        account.balance,
        account.currency,
        account.color,
        account.isActive ? 1 : 0,
        account.isPrimary ? 1 : 0,
        account.creditLimit || null,
        account.interestRate || null,
        account.note || "",
        account.createdAt,
        account.updatedAt || account.createdAt,
      ],
    );
  }

  async updateAccount(id: string, account: Partial<Account>): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (account.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(account.name);
    }
    if (account.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(account.displayName);
    }
    if (account.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(account.type);
    }
    if (account.institution !== undefined) {
      fields.push(`institution = $${paramIndex++}`);
      values.push(account.institution);
    }
    if (account.lastFour !== undefined) {
      fields.push(`last_four = $${paramIndex++}`);
      values.push(account.lastFour);
    }
    if (account.balance !== undefined) {
      fields.push(`balance = $${paramIndex++}`);
      values.push(account.balance);
    }
    if (account.currency !== undefined) {
      fields.push(`currency = $${paramIndex++}`);
      values.push(account.currency);
    }
    if (account.color !== undefined) {
      fields.push(`color = $${paramIndex++}`);
      values.push(account.color);
    }
    if (account.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(account.isActive ? 1 : 0);
    }
    if (account.isPrimary !== undefined) {
      fields.push(`is_primary = $${paramIndex++}`);
      values.push(account.isPrimary ? 1 : 0);
    }
    if (account.creditLimit !== undefined) {
      fields.push(`credit_limit = $${paramIndex++}`);
      values.push(account.creditLimit);
    }
    if (account.interestRate !== undefined) {
      fields.push(`interest_rate = $${paramIndex++}`);
      values.push(account.interestRate);
    }
    if (account.note !== undefined) {
      fields.push(`note = $${paramIndex++}`);
      values.push(account.note);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(id);

    const query = `UPDATE accounts SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
    await this.db.execute(query, values);
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute("DELETE FROM accounts WHERE id = $1", [id]);
  }

  // ==================== BUDGETS ====================

  async getAllBudgets(): Promise<Budget[]> {
    if (!this.db) throw new Error("DB not initialized");
    const rows = await this.db.select<any[]>(
      "SELECT * FROM budgets ORDER BY name ASC",
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      amount: row.amount || 0,
      spent: row.spent || 0,
      period: (row.period as BudgetPeriod) || "monthly",
      color: row.color || "#6366f1",
      icon: row.icon || undefined,
      isActive: row.is_active === 1,
      rollover: row.rollover === 1,
      alertThreshold: row.alert_threshold || 80,
      note: row.note || undefined,
      startDate: row.start_date || undefined,
      endDate: row.end_date || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    }));
  }

  async addBudget(budget: Budget): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute(
      `INSERT INTO budgets (
        id, name, category, amount, spent, period, color, icon,
        is_active, rollover, alert_threshold, note, start_date, end_date,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        budget.id,
        budget.name,
        budget.category,
        budget.amount,
        budget.spent,
        budget.period,
        budget.color,
        budget.icon || "",
        budget.isActive ? 1 : 0,
        budget.rollover ? 1 : 0,
        budget.alertThreshold,
        budget.note || "",
        budget.startDate || "",
        budget.endDate || "",
        budget.createdAt,
        budget.updatedAt || budget.createdAt,
      ],
    );
  }

  async updateBudget(id: string, budget: Partial<Budget>): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (budget.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(budget.name);
    }
    if (budget.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(budget.category);
    }
    if (budget.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(budget.amount);
    }
    if (budget.spent !== undefined) {
      fields.push(`spent = $${paramIndex++}`);
      values.push(budget.spent);
    }
    if (budget.period !== undefined) {
      fields.push(`period = $${paramIndex++}`);
      values.push(budget.period);
    }
    if (budget.color !== undefined) {
      fields.push(`color = $${paramIndex++}`);
      values.push(budget.color);
    }
    if (budget.icon !== undefined) {
      fields.push(`icon = $${paramIndex++}`);
      values.push(budget.icon);
    }
    if (budget.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(budget.isActive ? 1 : 0);
    }
    if (budget.rollover !== undefined) {
      fields.push(`rollover = $${paramIndex++}`);
      values.push(budget.rollover ? 1 : 0);
    }
    if (budget.alertThreshold !== undefined) {
      fields.push(`alert_threshold = $${paramIndex++}`);
      values.push(budget.alertThreshold);
    }
    if (budget.note !== undefined) {
      fields.push(`note = $${paramIndex++}`);
      values.push(budget.note);
    }
    if (budget.startDate !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(budget.startDate);
    }
    if (budget.endDate !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(budget.endDate);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(id);

    const query = `UPDATE budgets SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
    await this.db.execute(query, values);
  }

  async deleteBudget(id: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute("DELETE FROM budgets WHERE id = $1", [id]);
  }

  // ==================== RECURRING TRANSACTIONS ====================

  async getAllRecurring(): Promise<RecurringTransaction[]> {
    if (!this.db) throw new Error("DB not initialized");
    const rows = await this.db.select<any[]>(
      "SELECT * FROM recurring ORDER BY next_due ASC, name ASC",
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      payee: row.payee,
      description: row.description || undefined,
      amount: row.amount || 0,
      type: row.type as "credit" | "debit",
      category: row.category || "",
      account: row.account || "",
      destinationAccount: row.destination_account || undefined,
      method: (row.method as PaymentMethod) || "card",
      frequency: (row.frequency as RecurringFrequency) || "monthly",
      dayOfMonth: row.day_of_month || undefined,
      dayOfWeek: row.day_of_week || undefined,
      monthOfYear: row.month_of_year || undefined,
      startDate: row.start_date,
      endDate: row.end_date || null,
      nextDue: row.next_due || null,
      lastProcessed: row.last_processed || null,
      isActive: row.is_active === 1,
      autoProcess: row.auto_process === 1,
      variableAmount: row.variable_amount === 1,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    }));
  }

  async addRecurring(recurring: RecurringTransaction): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute(
      `INSERT INTO recurring (
        id, name, payee, description, amount, type, category, account,
        destination_account, method, frequency, day_of_month, day_of_week,
        month_of_year, start_date, end_date, next_due, last_processed,
        is_active, auto_process, variable_amount, tags, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        recurring.id,
        recurring.name,
        recurring.payee,
        recurring.description || "",
        recurring.amount,
        recurring.type,
        recurring.category,
        recurring.account,
        recurring.destinationAccount || "",
        recurring.method,
        recurring.frequency,
        recurring.dayOfMonth || null,
        recurring.dayOfWeek || null,
        recurring.monthOfYear || null,
        recurring.startDate,
        recurring.endDate || null,
        recurring.nextDue || null,
        recurring.lastProcessed || null,
        recurring.isActive ? 1 : 0,
        recurring.autoProcess ? 1 : 0,
        recurring.variableAmount ? 1 : 0,
        JSON.stringify(recurring.tags || []),
        recurring.createdAt,
        recurring.updatedAt || recurring.createdAt,
      ],
    );
  }

  async updateRecurring(
    id: string,
    recurring: Partial<RecurringTransaction>,
  ): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (recurring.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(recurring.name);
    }
    if (recurring.payee !== undefined) {
      fields.push(`payee = $${paramIndex++}`);
      values.push(recurring.payee);
    }
    if (recurring.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(recurring.description);
    }
    if (recurring.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(recurring.amount);
    }
    if (recurring.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(recurring.type);
    }
    if (recurring.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(recurring.category);
    }
    if (recurring.account !== undefined) {
      fields.push(`account = $${paramIndex++}`);
      values.push(recurring.account);
    }
    if (recurring.destinationAccount !== undefined) {
      fields.push(`destination_account = $${paramIndex++}`);
      values.push(recurring.destinationAccount);
    }
    if (recurring.method !== undefined) {
      fields.push(`method = $${paramIndex++}`);
      values.push(recurring.method);
    }
    if (recurring.frequency !== undefined) {
      fields.push(`frequency = $${paramIndex++}`);
      values.push(recurring.frequency);
    }
    if (recurring.dayOfMonth !== undefined) {
      fields.push(`day_of_month = $${paramIndex++}`);
      values.push(recurring.dayOfMonth);
    }
    if (recurring.dayOfWeek !== undefined) {
      fields.push(`day_of_week = $${paramIndex++}`);
      values.push(recurring.dayOfWeek);
    }
    if (recurring.monthOfYear !== undefined) {
      fields.push(`month_of_year = $${paramIndex++}`);
      values.push(recurring.monthOfYear);
    }
    if (recurring.startDate !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(recurring.startDate);
    }
    if (recurring.endDate !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(recurring.endDate);
    }
    if (recurring.nextDue !== undefined) {
      fields.push(`next_due = $${paramIndex++}`);
      values.push(recurring.nextDue);
    }
    if (recurring.lastProcessed !== undefined) {
      fields.push(`last_processed = $${paramIndex++}`);
      values.push(recurring.lastProcessed);
    }
    if (recurring.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(recurring.isActive ? 1 : 0);
    }
    if (recurring.autoProcess !== undefined) {
      fields.push(`auto_process = $${paramIndex++}`);
      values.push(recurring.autoProcess ? 1 : 0);
    }
    if (recurring.variableAmount !== undefined) {
      fields.push(`variable_amount = $${paramIndex++}`);
      values.push(recurring.variableAmount ? 1 : 0);
    }
    if (recurring.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(recurring.tags));
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(id);

    const query = `UPDATE recurring SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
    await this.db.execute(query, values);
  }

  async deleteRecurring(id: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute("DELETE FROM recurring WHERE id = $1", [id]);
  }
}
