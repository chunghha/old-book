import { LocalStorageAdapter } from "./local";
import { SqliteAdapter } from "./sqlite";
import { StorageAdapter } from "./types";

// Simple check for Tauri environment
const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let adapterInstance: StorageAdapter | null = null;

export async function getDatabase(): Promise<StorageAdapter> {
  if (adapterInstance) return adapterInstance;

  if (isTauri) {
    console.log("Initializing SQLite Adapter (Tauri)...");
    const adapter = new SqliteAdapter();
    await adapter.init();
    adapterInstance = adapter;
  } else {
    console.log("Initializing LocalStorage Adapter (Web)...");
    const adapter = new LocalStorageAdapter();
    await adapter.init();
    adapterInstance = adapter;
  }

  return adapterInstance;
}
