import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Theme index for Book Keeper app
 *
 * Responsibilities:
 * - Import theme CSS entry points (placeholders)
 * - Provide a lightweight ThemeProvider that persists selection to localStorage
 * - Apply a theme class to the documentElement so CSS can scope by theme
 * - Export a `useTheme` hook for consumers
 *
 * Note:
 * - The CSS files referenced below are intentionally minimal placeholders.
 * - If you want to create richer themes, add the corresponding CSS files in the
 *   same directory (kde.css, aix.css, beos.css, cde.css).
 */

/* Import theme CSS files. These are the entry points for each theme.
   Each file should register CSS rules that target the corresponding
   class added to <html>, e.g. `.theme-kde .some-element { ... }`.
   Keeping imports here ensures bundlers include theme assets. */
import "./kde.css";
import "./aix.css";
import "./beos.css";
import "./cde.css";

export type ThemeKey = "kde" | "aix" | "beos" | "cde";

export const themeClassFor: Record<ThemeKey, string> = {
  kde: "theme-kde",
  aix: "theme-aix",
  beos: "theme-beos",
  cde: "theme-cde",
};

const STORAGE_KEY = "bk:theme:v1";

type ThemeContextValue = {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * ThemeProvider wraps the app and persists the chosen theme to localStorage.
 * It also keeps the class on document.documentElement in sync, so CSS can
 * scope styles for each theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw && (raw === "kde" || raw === "aix" || raw === "beos" || raw === "cde")) {
        return raw;
      }
    } catch {
      // ignore
    }
    return "kde";
  });

  useEffect(() => {
    try {
      if (typeof document !== "undefined") {
        // remove any previous theme classes we may have added
        Object.values(themeClassFor).forEach((c) => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(themeClassFor[theme]);
      }
    } catch {
      // ignore
    }

    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // ignore storage failures
    }
  }, [theme]);

  function setTheme(t: ThemeKey) {
    setThemeState(t);
  }

  function cycleTheme() {
    const order: ThemeKey[] = ["kde", "aix", "beos", "cde"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context.
 * Usage:
 *   const { theme, setTheme, cycleTheme } = useTheme();
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/* Convenience default export */
export default {
  ThemeProvider,
  useTheme,
  themeClassFor,
};
