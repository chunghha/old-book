import Database from "@tauri-apps/plugin-sql";
import { StorageAdapter, Transaction } from "./types";

export class SqliteAdapter implements StorageAdapter {
  private db: Database | null = null;

  async init(): Promise<void> {
    try {
      this.db = await Database.load("sqlite:book-keeper.db");
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
          created_at TEXT,
          updated_at TEXT
        );
      `);

      // Add new columns if they don't exist (for migrations)
      const columns = [
        { name: "payee", type: "TEXT" },
        { name: "method", type: "TEXT" },
        { name: "receipt_status", type: "TEXT" },
        { name: "status", type: "TEXT DEFAULT 'pending'" },
      ];

      for (const col of columns) {
        try {
          await this.db.execute(
            `ALTER TABLE transactions ADD COLUMN ${col.name} ${col.type}`,
          );
        } catch {
          // Column likely already exists, ignore
        }
      }
    } catch (e) {
      console.error("Failed to init SQLite:", e);
      throw e;
    }
  }

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
      method: row.method || undefined,
      receiptStatus: row.receipt_status || undefined,
      status: row.status || "pending",
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    }));
  }

  async add(tx: Transaction): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute(
      `INSERT INTO transactions (
        id, date, amount, type, payee, description, account, category,
        tags, method, receipt_status, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
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

    // Always update the updated_at timestamp
    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    // Add id for WHERE clause
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
}
