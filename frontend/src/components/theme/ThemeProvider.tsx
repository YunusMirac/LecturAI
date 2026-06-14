"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const THEME_STORAGE_KEY = "lectur-theme";

export type Theme = "dark" | "light";

const DEFAULT_THEME: Theme = "dark";

type ThemeContextValue = {
  /** Erst nach Mount gesetzt — vermeidet Hydration-Mismatch am Toggle-Label. */
  mounted: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Nur DOM — wird vom Blocking-Skript in layout.tsx und bei User-Aktion aufgerufen. */
function paintTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const wantDark = theme === "dark";
  document.documentElement.classList.toggle("dark", wantDark);
  document.documentElement.style.colorScheme = wantDark ? "dark" : "light";
  document.documentElement.dataset.themeReady = "";
}

export function applyThemeToDocument(theme: Theme) {
  paintTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setThemeState(readStoredTheme());
      setMounted(true);
    });
  }, []);

  // Andere Browser-Tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue !== "light" && e.newValue !== "dark") return;
      paintTheme(e.newValue);
      setThemeState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyThemeToDocument(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = readStoredTheme() === "dark" ? "light" : "dark";
    applyThemeToDocument(next);
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ mounted, theme, setTheme, toggleTheme }),
    [mounted, theme, setTheme, toggleTheme]
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
