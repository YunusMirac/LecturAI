"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const THEME_STORAGE_KEY = "lectur-theme";

/** Wird nach DOM + localStorage-Update gefeuert (gleicher Tab; `storage` nur für andere Tabs). */
export const THEME_CHANGED_EVENT = "lectur-theme-changed";

export type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
  }
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onThemeChanged = () => onStoreChange();
  window.addEventListener(THEME_CHANGED_EVENT, onThemeChanged);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    if (e.newValue === "light" || e.newValue === "dark") {
      applyThemeToDocument(e.newValue);
    } else {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(THEME_CHANGED_EVENT, onThemeChanged);
    window.removeEventListener("storage", onStorage);
  };
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);

  const setTheme = useCallback((next: Theme) => {
    applyThemeToDocument(next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyThemeToDocument(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme muss innerhalb von ThemeProvider verwendet werden.");
  }
  return ctx;
}
