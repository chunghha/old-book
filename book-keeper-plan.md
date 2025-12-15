# Book Keeper Implementation Plan

## Project Goal
A local-first personal finance application with retro Desktop Environment themes (KDE, AIX, BeOS, CDE).

**Current Status:** UI Prototype Complete (React + Tailwind v4 + LocalStorage).
**Next Phase:** Desktop Native Migration (Tauri + SQLite).

## Architecture

### 1. Tech Stack
- **Frontend:** TanStack Start (React), Tailwind CSS v4, Lucide Icons.
- **State Management:** Zustand (migrating to Async Actions).
- **Desktop Wrapper:** Tauri v2.
- **Database:** SQLite (via `tauri-plugin-sql`).
- **Routing:** Manual SPA Routing (currently), moving to TanStack Router for type-safety.

### 2. Directory Structure (Planned)
```text
project/
├── src-tauri/             # RUST: Native backend
│   ├── src/
│   │   ├── main.rs        # App entry
│   │   └── lib.rs         # Command handlers
│   ├── migrations/        # SQL migration files
│   └── tauri.conf.json    # Window config
├── app/
│   ├── db/
│   │   ├── client.ts      # Abstracted DB adapter
│   │   ├── sqlite.ts      # Tauri implementation
│   │   └── local.ts       # Web fallback (localStorage)
│   ├── stores/
│   │   └── transactions.ts # Refactored for Async
```

## Implementation Roadmap

### Phase 1: UI & Themes (✅ COMPLETED)

Set up Vite + React + Tailwind v4.

Implement "Desktop Layer" architecture for centering windows.

Create Theme Engine (CSS Variables + Scoped Classes).

Implement Themes:

KDE (Plastic)

AIX (Motif)

BeOS (Yellow Tab)

CDE (Solaris Teal)

Build Graph/Chart components with SVG.

Basic CRUD with localStorage.

### Phase 2: Tauri Integration (Current Focus)

Initialize Tauri: Add Rust backend to the project.

Configure Windows: Remove system chrome (frame: false) so our CSS themes handle the title bars and window controls.

Window Dragging: Connect the CSS Title Bars (data-tauri-drag-region) to native window movement.

### Phase 3: Database Migration (SQLite)

Install Plugin: Add @tauri-apps/plugin-sql.

Schema Design:
code
SQL
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT CHECK(type IN ('credit', 'debit')),
  description TEXT,
  account TEXT,
  category TEXT,
  tags TEXT, -- JSON string or comma-separated
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

Store Refactor:
Convert useTransactionsStore from synchronous to asynchronous.
Implement a Data Adapter pattern:
interface StorageAdapter { getAll(): Promise<Tx[]>; add(tx): Promise<void>; ... }
This allows the app to still run in "Web Mode" (demo) vs "App Mode" (SQLite).

### Phase 4: Advanced Features

TanStack Query: Replace manual useEffect fetching with useQuery for better caching/loading states.

Virtualization: Use TanStack Virtual for the transaction table to handle 10,000+ rows.

File System Access: Native Import/Export using Tauri FS dialogs.
