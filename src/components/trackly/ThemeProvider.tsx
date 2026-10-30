"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_THEME: Theme = "dark";
const STORAGE_KEY = "trackly-theme";
const THEME_EVENT = "trackly-theme-change";

// Subscribe to theme changes — listens for cross-tab "storage" events AND in-tab custom events.
function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

// Client snapshot — reads localStorage. Returns the same value during a single render pass.
function getSnapshot(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? DEFAULT_THEME;
}

// Server snapshot — always returns the default so SSR HTML and the initial client hydration render match.
function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

// Persist theme to localStorage (skipped on first mount to preserve user's saved value)
function persistTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore is hydration-safe by design:
  // - Server render uses getServerSnapshot() → DEFAULT_THEME
  // - Initial client hydration render ALSO uses getServerSnapshot() → matches SSR HTML, no mismatch
  // - After hydration, React re-renders with getSnapshot() → user's saved theme takes effect
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Track whether we've completed the first render cycle so we don't overwrite
  // the user's saved localStorage value with the default on mount.
  const hasMountedRef = useRef(false);

  // Apply the theme to <html> class. Persist to localStorage ONLY on subsequent theme changes
  // (not on the first mount, to preserve the user's saved preference).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (hasMountedRef.current) {
      persistTheme(theme);
    }
    hasMountedRef.current = true;
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    persistTheme(t);
  }, []);

  const toggle = useCallback(() => {
    const current = (typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) as Theme | null)
      : null) ?? DEFAULT_THEME;
    persistTheme(current === "dark" ? "light" : "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
