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
          description TEXT,
          account TEXT,
          category TEXT,
          tags TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
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
      description: row.description,
      account: row.account,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async add(tx: Transaction): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute(
      `INSERT INTO transactions (id, date, amount, type, description, account, category, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        tx.id,
        tx.date,
        tx.amount,
        tx.type,
        tx.description || "",
        tx.account || "",
        tx.category || "",
        JSON.stringify(tx.tags || []),
        tx.createdAt,
        tx.updatedAt || tx.createdAt,
      ],
    );
  }

  async update(id: string, tx: Partial<Transaction>): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");

    // Construct dynamic update query
    const fields: string[] = [];
    const values: any[] = [];

    if (tx.date !== undefined) {
      fields.push("date = ?");
      values.push(tx.date);
    }
    if (tx.amount !== undefined) {
      fields.push("amount = ?");
      values.push(tx.amount);
    }
    if (tx.type !== undefined) {
      fields.push("type = ?");
      values.push(tx.type);
    }
    if (tx.description !== undefined) {
      fields.push("description = ?");
      values.push(tx.description);
    }
    if (tx.account !== undefined) {
      fields.push("account = ?");
      values.push(tx.account);
    }
    if (tx.category !== undefined) {
      fields.push("category = ?");
      values.push(tx.category);
    }
    if (tx.tags !== undefined) {
      fields.push("tags = ?");
      values.push(JSON.stringify(tx.tags));
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());

    values.push(id); // For WHERE clause

    const sql = `UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`;

    // Note: tauri-plugin-sql uses $1, $2 syntax for execute, but sometimes ? works depending on driver.
    // To be safe with the plugin's bind array, we just pass the array.
    // However, constructing dynamic SQL with bindings in this plugin can be tricky.
    // For simplicity in this prototype, we'll assume full object updates or basic fields.
    // Let's use a simpler approach: Read, Merge, Write (less efficient but safer for prototype)
    // OR just execute specific updates.

    // Actually, let's try the direct query with $1 params manually mapped.
    let query = "UPDATE transactions SET ";
    query += fields.map((f, i) => f.replace("?", `$${i + 1}`)).join(", ");
    query += ` WHERE id = $${values.length}`;

    await this.db.execute(query, values);
  }

  async delete(id: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.execute("DELETE FROM transactions WHERE id = $1", [id]);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (ids.length === 0) return;

    // SQLite doesn't support array binding for IN clause easily in all drivers.
    // We'll generate placeholders.
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
    // Run in transaction ideally, but plugin might not expose explicit transaction object easily.
    // We will loop inserts.
    for (const tx of txs) {
      await this.add(tx);
    }
  }
}
