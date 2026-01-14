"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

function normalizeWaNumber(raw: string) {
  return raw.replace(/[^0-9]/g, "");
}

function buildWaHref(numberRaw: string, textRaw?: string | null) {
  let number = normalizeWaNumber(numberRaw);
  if (!number) return null;

  // Heuristic: if a 10-digit number is provided, assume India country code.
  if (number.length === 10) number = `91${number}`;

  const text = (textRaw && textRaw.trim().length ? textRaw.trim() : null) || "Hi Bohosaaz, I need help with...";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

let warnedMissing = false;

export default function WhatsAppFloat({ className }: { className?: string }) {
  const envNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const envText = process.env.NEXT_PUBLIC_WHATSAPP_TEXT;

  // Fallback requested by user; can be overridden by env or Setting keys.
  const defaultNumber = "9992196879";

  const [href, setHref] = React.useState<string | null>(() => {
    if (envNumber) return buildWaHref(envNumber, envText);
    return buildWaHref(defaultNumber, envText);
  });

  React.useEffect(() => {
    if (envNumber) return;

    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/public/whatsapp", { signal: ac.signal, cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as unknown;
        const data = j && typeof j === "object" ? (j as { data?: unknown }).data : null;
        const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
        const number = typeof obj?.number === "string" ? obj.number : null;
        const text = typeof obj?.text === "string" ? obj.text : null;

        if (number) {
          const nextHref = buildWaHref(number, text);
          if (nextHref) setHref(nextHref);
        } else if (process.env.NODE_ENV !== "production" && !warnedMissing) {
          warnedMissing = true;
          console.warn(
            "[WhatsAppFloat] Missing WhatsApp number. Set NEXT_PUBLIC_WHATSAPP_NUMBER or create Setting keys whatsapp.number (+ optional whatsapp.text).",
          );
        }
      } catch {
        // ignore
      }
    })();

    return () => ac.abort();
  }, [envNumber]);

  const isConfigured = Boolean(href);
  const displayHref = href ?? "https://wa.me/";

  return (
    <div className={cn("fixed bottom-5 right-5 z-50", className)}>
      <div className="group relative">
        <Link
          href={displayHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isConfigured ? "Chat on WhatsApp" : "WhatsApp (not configured)"}
          className={cn(
            "h-11 w-11 grid place-items-center rounded-2xl border border-border bg-card/85 backdrop-blur shadow-premium transition",
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 2a9.5 9.5 0 0 0-8.2 14.3L2.7 21.3l5.1-1.1A9.5 9.5 0 1 0 12 2Z"
              fill="rgb(37 211 102)"
            />
            <path
              d="M16.7 14.2c-.2.6-1.1 1.1-1.7 1.2-.4.1-.9.1-3-.6-2.7-1.1-4.4-3.6-4.6-3.8-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4-.1.6.5.2.5.8 1.9.9 2 .1.1.1.3 0 .5l-.3.4c-.1.2-.3.3-.4.5-.1.1-.3.3-.1.5.2.3.7 1.1 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.2.4.2.6 0 .2-.2.7-.8.8-1 .2-.3.4-.2.6-.1.2.1 1.5.7 1.7.8.2.1.4.2.5.3.1.2.1.6-.1 1.1Z"
              fill="#fff"
            />
          </svg>
        </Link>

        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute right-0 -top-10 whitespace-nowrap rounded-(--radius) border border-border bg-card px-2.5 py-1 text-xs text-foreground shadow-sm",
            "opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0",
          )}
        >
          {isConfigured ? "Chat on WhatsApp" : "WhatsApp not configured"}
        </div>
      </div>
    </div>
  );
}
