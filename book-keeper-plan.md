# Book Keeper Implementation Plan

## Project Goal
A local-first personal finance application with retro Desktop Environment themes (KDE, AIX, BeOS, CDE).

**Current Status:** Phase 4 In Progress (Advanced Features).
**Completed:** UI, Themes, Tauri, SQLite, Accounts, Budgets, Recurring Transactions.

## Architecture

### 1. Tech Stack
- **Frontend:** TanStack Start (React), Tailwind CSS v4, Lucide Icons.
- **State Management:** Zustand (Async Actions).
- **Desktop Wrapper:** Tauri v2.
- **Database:** SQLite (via `tauri-plugin-sql`).
- **Routing:** Manual SPA Routing (currently), moving to TanStack Router for type-safety.

### 2. Directory Structure
```text
project/
├── src-tauri/             # RUST: Native backend
│   ├── src/
│   │   ├── main.rs        # App entry
│   │   └── lib.rs         # Command handlers & plugin registration
│   ├── capabilities/      # Tauri permissions
│   │   └── default.json   # Window & SQL permissions
│   └── tauri.conf.json    # Window config (frameless)
├── app/
│   ├── db/
│   │   ├── index.ts       # Abstracted DB adapter factory
│   │   ├── types.ts       # StorageAdapter interface & Transaction type
│   │   ├── sqlite.ts      # Tauri SQLite implementation
│   │   └── local.ts       # Web fallback (localStorage)
│   ├── lib/
│   │   └── window.ts      # Tauri window controls (min/max/close)
│   ├── stores/
│   │   └── transactions.tsx # Zustand store (async actions)
│   ├── themes/
│   │   ├── index.tsx      # ThemeProvider & useTheme hook
│   │   ├── kde.css        # KDE Plastic theme
│   │   ├── aix.css        # AIX Motif theme
│   │   ├── beos.css       # BeOS Yellow Tab theme
│   │   └── cde.css        # CDE Solaris theme
│   └── routes/
│       ├── __root.tsx     # App shell with themed window chrome
│       ├── transactions/  # Transaction list & form
│       └── settings/      # Theme picker & import/export
├── src/
│   ├── main.tsx           # SPA router mount
│   ├── landing.tsx        # Landing page component
│   └── index.css          # Tailwind entry + base styles
└── package.json
```

## Implementation Roadmap

### Phase 1: UI & Themes (✅ COMPLETED)

- [x] Set up Vite + React + Tailwind v4.
- [x] Implement "Desktop Layer" architecture for centering windows.
- [x] Create Theme Engine (CSS Variables + Scoped Classes).
- [x] Implement Themes:
  - [x] KDE (Plastic)
  - [x] AIX (Motif)
  - [x] BeOS (Yellow Tab)
  - [x] CDE (Solaris Teal)
- [x] Build Graph/Chart components with SVG.
- [x] Basic CRUD with localStorage.

### Phase 2: Tauri Integration (✅ COMPLETED)

- [x] Initialize Tauri: Add Rust backend to the project.
- [x] Configure Windows: Remove system chrome (`decorations: false`) so CSS themes handle title bars.
- [x] Window Dragging: Connect CSS Title Bars (`data-tauri-drag-region`) to native window movement.
- [x] Window Controls: Implement minimize, maximize, and close buttons via `@tauri-apps/api/window`.
- [x] Permissions: Configure capabilities for `core:window:*` and `sql:default`.

**Implementation Notes (Phase 2):**
- Window controls are in `app/lib/window.ts` with graceful web fallback.
- All four theme window chromes (CDE, BeOS, AIX, KDE) now have functional buttons.
- Tauri config uses `frontendDist: "../dist"` to match Vite output.

### Phase 3: Database Migration (✅ COMPLETED)

- [x] Install Plugin: Add `@tauri-apps/plugin-sql` and register in `lib.rs`.
- [x] Schema Design:
```sql
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
```
- [x] Store Refactor: Convert `useTransactionsStore` from synchronous to async.
- [x] Data Adapter Pattern:
```typescript
interface StorageAdapter {
  init(): Promise<void>;
  getAll(): Promise<Transaction[]>;
  add(tx: Transaction): Promise<void>;
  update(id: string, tx: Partial<Transaction>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  clearAll(): Promise<void>;
  import(txs: Transaction[]): Promise<void>;
}
```
- [x] Dual Mode: App runs in "Web Mode" (localStorage) vs "App Mode" (SQLite) automatically.

### Phase 4: Advanced Features (🔄 IN PROGRESS)

- [x] **TanStack Form:** Full form integration for add/edit transactions.
- [x] **Edit Transaction Modal:** Click pencil icon to edit any transaction inline.
- [x] **Multiple Account Support:** Checking, savings, credit, investment account types.
- [x] **Budget Tracking:** Set budgets per category with alerts, rollover, and progress tracking.
- [x] **Recurring Transactions:** Schedule recurring payments with auto-processing and skip functionality.
- [ ] **TanStack Query:** Replace manual `useEffect` fetching with `useQuery` for better caching/loading states.
- [ ] **Virtualization:** Use TanStack Virtual for the transaction table to handle 10,000+ rows.
- [ ] **File System Access:** Native Import/Export using Tauri FS dialogs.
- [ ] **TanStack Router:** Replace manual SPA routing with type-safe file-based routing.
- [ ] **Dashboard Page:** Account summaries, budget progress, upcoming recurring.

## Test Data

Sample data files in `test-data/` for development and testing:

| File | Records | Description |
|------|---------|-------------|
| `transactions.json` | 60 | Sample transactions (Jan-Mar 2024) |
| `accounts.json` | 7 | Checking, savings, credit, investment accounts |
| `budgets.json` | 15 | Budget categories with spending data |
| `recurring.json` | 20 | Subscriptions, bills, salary, transfers |

## Dependencies

### Frontend (package.json)
- `react` / `react-dom` ^19.x
- `zustand` ^5.x
- `tailwindcss` ^4.x
- `@tailwindcss/vite` ^4.x
- `lucide-react` ^0.561.x
- `@tauri-apps/api` ^2.9.x
- `@tauri-apps/plugin-sql` ^2.3.x
- `@tanstack/react-form` ^1.27.x (form state management)
- `@tanstack/react-virtual` ^3.x (virtualized lists)
- `@tanstack/react-query` ^5.x (installed, not yet used)
- `@tanstack/react-router` ^1.x (installed, not yet used)

### Backend (Cargo.toml)
- `tauri` ^2.9.x
- `tauri-plugin-sql` ^2.3.x (with `sqlite` feature)
- `tauri-plugin-log` ^2.7.x
- `serde` / `serde_json`

## Running the App

```bash
# Web mode (development)
bun dev

# Tauri desktop mode
bun tauri:dev

# Build for production
bun tauri build
```
