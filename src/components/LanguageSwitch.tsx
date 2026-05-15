"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { isLocale, type Locale } from "@/lib/i18n";

const LS_KEY = "bohosaaz_lang";
const COOKIE_KEY = "bohosaaz_lang";

function setLangPersistence(lang: Locale) {
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    // ignore
  }

  try {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(lang)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function detectLangFromPath(pathname: string): Locale {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg && isLocale(seg) ? seg : "en";
}

function buildSwitchedPath(pathname: string, lang: Locale) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return `/${lang}`;

  if (isLocale(parts[0])) {
    parts[0] = lang;
    return `/${parts.join("/")}`;
  }

  // If current path isn't localized, prefer sending user to localized root.
  return `/${lang}`;
}

function SwitchButton({
  lang,
  label,
  active,
  onSelect,
}: {
  lang: Locale;
  label: string;
  active: boolean;
  onSelect: (lang: Locale) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 px-3 rounded-xl text-[11px] uppercase tracking-[0.18em] transition border",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:bg-muted/40",
      )}
      aria-pressed={active}
      onClick={() => onSelect(lang)}
    >
      {label}
    </button>
  );
}

export default function LanguageSwitch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLang = React.useMemo(() => detectLangFromPath(pathname || "/"), [pathname]);

  const qs = searchParams?.toString() || "";

  const onSelect = React.useCallback(
    (lang: Locale) => {
      if (lang === currentLang) return;
      setLangPersistence(lang);
      const nextPath = buildSwitchedPath(pathname || "/", lang);
      router.push(qs ? `${nextPath}?${qs}` : nextPath);
    },
    [currentLang, pathname, qs, router],
  );

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-2xl border border-border bg-background/60 p-1", className)}>
      <SwitchButton lang="en" label="EN" active={currentLang === "en"} onSelect={onSelect} />
      <SwitchButton lang="hi" label="HI" active={currentLang === "hi"} onSelect={onSelect} />
    </div>
  );
}
