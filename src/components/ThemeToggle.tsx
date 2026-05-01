"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

const LS_KEY = "bohosaaz_theme";

type Theme = "light" | "dark";

function readStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "light" || v === "dark") return v;
    return null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const initial = readStoredTheme() ?? "dark";
    setTheme(initial);
    applyTheme(initial);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY) return;
      const next = readStoredTheme() ?? "dark";
      setTheme(next);
      applyTheme(next);
    };

    window.addEventListener("storage", onStorage);

    return () => {
      try {
        mql?.removeEventListener?.("change", onSystemChange);
      } catch {
        // ignore
      }
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={cn(
        "h-10 w-10 grid place-items-center rounded-2xl border border-border bg-card hover:bg-muted/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        const next: Theme = isDark ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
        try {
          localStorage.setItem(LS_KEY, next);
        } catch {
          // ignore
        }
      }}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12.8A8.2 8.2 0 0 1 11.2 3 6.8 6.8 0 1 0 21 12.8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
