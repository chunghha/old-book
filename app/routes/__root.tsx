import React from "react";
import {
  Sun,
  Moon,
  Grid,
  Settings,
  FileText,
  X,
  Minus,
  Square,
  Wallet,
} from "lucide-react";
import { ThemeProvider, useTheme } from "../themes";
import { minimizeWindow, toggleMaximize, closeWindow } from "../lib/window";

export default Root;

function Root({ children }: { children?: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}

/* ----------------------------- App Shell ------------------------------ */

function AppShell({ children }: { children?: React.ReactNode }) {
  const { theme } = useTheme();

  // "Classic" means we render a Desktop Environment window centered on screen
  const isClassic = ["kde", "aix", "beos", "cde"].includes(theme);

  const content = (
    <div className="flex flex-col h-full text-slate-900 dark:text-slate-100">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="w-full h-full">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );

  if (isClassic) {
    return (
      <div className="desktop-layer min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
        {theme === "cde" && <CDEWindow>{content}</CDEWindow>}
        {theme === "beos" && <BeOSWindow>{content}</BeOSWindow>}
        {theme === "aix" && <AIXWindow>{content}</AIXWindow>}
        {theme === "kde" && <KDEWindow>{content}</KDEWindow>}
      </div>
    );
  }

  // Modern / Default View
  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 antialiased">
      {content}
    </div>
  );
}

/* ------------------------- Window Chromes -------------------------- */

/*
   NOTE: 'data-tauri-drag-region' is added to title bars.
   This allows the user to drag the frameless window around the screen.

   The window control buttons now call the Tauri window API functions.
*/

function CDEWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="window cde-raised flex flex-col !w-[1400px] !h-[900px] max-w-full max-h-full shadow-2xl">
      <div
        className="title-bar select-none cursor-default shrink-0"
        data-tauri-drag-region
      >
        <div className="window-controls">
          <button
            type="button"
            className="win-btn"
            onClick={minimizeWindow}
            title="Minimize"
          >
            <Minus size={10} strokeWidth={4} />
          </button>
        </div>
        <div className="window-title pointer-events-none">
          Acme Inc - Book Keeper
        </div>
        <div className="window-controls">
          <button
            type="button"
            className="win-btn"
            onClick={toggleMaximize}
            title="Maximize"
          >
            <Square size={8} fill="currentColor" />
          </button>
          <button
            type="button"
            className="win-btn"
            onClick={closeWindow}
            title="Close"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      </div>
      <div className="app-content flex-1 overflow-hidden relative flex flex-col">
        {children}
      </div>
    </div>
  );
}

function BeOSWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="window-container flex flex-col !w-[1400px] !h-[900px] max-w-full max-h-full filter drop-shadow-lg">
      <div className="window-tab select-none shrink-0" data-tauri-drag-region>
        <button
          type="button"
          className="tab-close"
          onClick={closeWindow}
          title="Close"
        />
        <div className="window-title pointer-events-none">
          Acme Inc : Book Keeper
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="tab-btn"
            onClick={minimizeWindow}
            title="Minimize"
            style={{
              width: 12,
              height: 12,
              background: "#FFD700",
              border: "1px solid #333",
              cursor: "pointer",
            }}
          />
          <button
            type="button"
            className="tab-btn"
            onClick={toggleMaximize}
            title="Maximize"
            style={{
              width: 12,
              height: 12,
              background: "#32CD32",
              border: "1px solid #333",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
      <div className="window-frame flex-1 overflow-hidden flex flex-col">
        {children}
        <div className="resize-handle" />
      </div>
    </div>
  );
}

function AIXWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mwm-window !w-[1400px] !h-[900px] max-w-full max-h-full flex flex-col">
      <div className="title-bar select-none shrink-0" data-tauri-drag-region>
        <button
          type="button"
          className="mwm-btn ml-[2px]"
          onClick={closeWindow}
          title="Close"
        >
          <div className="icon-menu" />
        </button>
        <div className="title-text flex-1 pointer-events-none">
          acme_inc : book_keeper
        </div>
        <div className="flex gap-[2px] mr-[2px]">
          <button
            type="button"
            className="mwm-btn"
            onClick={minimizeWindow}
            title="Minimize"
          >
            <div className="icon-min" />
          </button>
          <button
            type="button"
            className="mwm-btn"
            onClick={toggleMaximize}
            title="Maximize"
          >
            <div className="icon-max" />
          </button>
        </div>
      </div>
      <div className="mwm-outer-frame flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

function KDEWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="kwin-window !w-[1400px] !h-[900px] max-w-full max-h-full flex flex-col">
      <div className="title-bar select-none shrink-0" data-tauri-drag-region>
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="window-icon" />
          <div className="window-title">Acme Inc - Book Keeper</div>
        </div>
        <div className="window-controls">
          <button type="button" className="win-btn" title="Help">
            ?
          </button>
          <button
            type="button"
            className="win-btn"
            onClick={minimizeWindow}
            title="Minimize"
          >
            _
          </button>
          <button
            type="button"
            className="win-btn"
            onClick={toggleMaximize}
            title="Maximize"
          >
            □
          </button>
          <button
            type="button"
            className="win-btn bg-red-800/50 border-red-900"
            onClick={closeWindow}
            title="Close"
          >
            X
          </button>
        </div>
      </div>
      <div className="flex-1 bg-[#efefef] flex flex-col overflow-hidden text-[#222]">
        {children}
      </div>
    </div>
  );
}

/* ----------------------- Internal Components ------------------------ */

function Header() {
  const { theme, cycleTheme } = useTheme();

  const themeLabels: Record<string, string> = {
    kde: "KDE",
    aix: "AIX",
    beos: "BeOS",
    cde: "CDE",
  };

  return (
    <header className="border-b shrink-0 z-10 p-3 flex items-center justify-between gap-4 transition-colors bg-inherit">
      <div className="flex items-center gap-3">
        <Wallet className="w-8 h-8" />
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-tight">
            Book Keeper
          </h1>
          <p className="text-xs opacity-70">Local-first finances</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <button
          onClick={cycleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:opacity-80 transition-opacity"
          title="Switch Theme"
        >
          {theme === "kde" ? (
            <Grid size={14} />
          ) : theme === "aix" ? (
            <Sun size={14} />
          ) : theme === "beos" ? (
            <Moon size={14} />
          ) : (
            <Square size={14} />
          )}
          <span className="hidden sm:inline">
            {themeLabels[theme] || theme}
          </span>
        </button>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="w-56 border-r hidden md:flex flex-col p-4 gap-6 shrink-0 z-0 bg-inherit">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2 pl-1">
          Navigate
        </div>
        <div className="flex flex-col gap-1">
          <SidebarLink to="/" icon={<Grid size={14} />}>
            Dashboard
          </SidebarLink>
          <SidebarLink to="/transactions" icon={<FileText size={14} />}>
            Transactions
          </SidebarLink>
          <SidebarLink to="/settings" icon={<Settings size={14} />}>
            Settings
          </SidebarLink>
        </div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2 pl-1">
          Actions
        </div>
        <div className="flex flex-col gap-1">
          <button className="text-left px-3 py-1.5 rounded text-sm hover:underline hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            + New Entry
          </button>
          <button className="text-left px-3 py-1.5 rounded text-sm hover:underline hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            Import CSV
          </button>
        </div>
      </div>
    </aside>
  );
}

function Footer() {
  return (
    <footer className="border-t py-2 px-4 text-xs opacity-60 flex justify-between shrink-0 bg-inherit">
      <span>© {new Date().getFullYear()} Book Keeper</span>
      <span className="hidden sm:inline">TanStack Start Prototype</span>
    </footer>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const isActive =
    typeof window !== "undefined" && window.location.pathname === to;
  return (
    <a
      href={to}
      onClick={(e) => handleNav(e, to)}
      className={`px-3 py-1.5 rounded text-sm transition-colors ${
        isActive
          ? "font-bold underline opacity-100"
          : "opacity-80 hover:opacity-100 hover:underline"
      }`}
    >
      {children}
    </a>
  );
}

function SidebarLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const isActive =
    typeof window !== "undefined" && window.location.pathname === to;
  return (
    <a
      href={to}
      onClick={(e) => handleNav(e, to)}
      className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
        isActive
          ? "bg-black/5 dark:bg-white/10 font-medium"
          : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {icon}
      {children}
    </a>
  );
}

function handleNav(e: React.MouseEvent, to: string) {
  if (to.startsWith("/")) {
    e.preventDefault();
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
