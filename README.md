# Book Keeper (Retro Edition)

A local-first personal finance application built with **TanStack Start**, **React**, and **Tailwind CSS v4**.

It features a unique "Desktop Environment" theming engine that accurately recreates the look and feel of classic operating systems, rendering the entire application window inside a themed desktop layer.

## 🎨 Themes

The app includes four pixel-perfect retro themes:
1.  **CDE (Common Desktop Environment):** Solaris-style teal, serif fonts, and thick beveled panels.
2.  **BeOS:** Classic yellow tabs, grey UI, and Verdana typography.
3.  **AIX (Motif):** Industrial grey, sharp edges, and Helvetica fonts.
4.  **KDE 3 (Plastic):** Early 2000s gradients, soft blue/grey palette, and Tahoma fonts.

## 🛠️ Tech Stack

*   **Framework:** TanStack Start (Prototype / SPA Mode)
*   **Styling:** Tailwind CSS v4 (with extensive CSS variable theming)
*   **State:** Zustand
*   **Persistence:** `localStorage` (Currently), migrating to **Tauri + SQLite**.
*   **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites
*   Bun

### Installation

```bash
bun install
```

### Run Development Server
```bash
bun dev
```
Open http://localhost:5174 in your browser.


## 🔮 Roadmap: Tauri + SQLite
The next phase of development involves wrapping this application in Tauri.

Native Windowing: The CSS-drawn title bars (CDE/BeOS tabs) will become the actual drag handles for the native OS window.

SQLite Database: Moving away from localStorage to a local SQLite file for robust data handling.
Performance: Using Rust for heavy data processing (importing large CSVs).


## 📂 Project Structure
app/routes/: Application pages (Transactions, Settings).
app/themes/: CSS entry points for each desktop environment.
app/stores/: Zustand state management.
src/main.tsx: Entry point and manual router configuration.
