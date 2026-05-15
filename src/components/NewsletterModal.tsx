"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const LS_KEY_HIDE_UNTIL = "bohosaaz_newsletter_hide_until";
const HIDE_DAYS = 7;

function getHideUntil(): number {
  try {
    const raw = localStorage.getItem(LS_KEY_HIDE_UNTIL);
    if (!raw) return 0;
    const v = Number(raw);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function setHideForDays(days: number) {
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(LS_KEY_HIDE_UNTIL, String(until));
  } catch {
    // ignore
  }
}

export default function NewsletterModal() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hideUntil = getHideUntil();
    if (hideUntil && hideUntil > Date.now()) return;

    const delayMs = 6000 + Math.floor(Math.random() * 4000);
    const t = window.setTimeout(() => {
      setOpen(true);
    }, delayMs);

    return () => window.clearTimeout(t);
  }, []);

  async function submit() {
    setError(null);
    const v = email.trim();
    if (!v) return setError("Please enter your email");

    setBusy(true);
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: v, source: "modal" }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error || "Subscription failed");
      return;
    }

    setDone(true);
    setHideForDays(HIDE_DAYS);
  }

  function close() {
    setOpen(false);
  }

  function dontShowAgain() {
    setHideForDays(HIDE_DAYS);
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setHideForDays(HIDE_DAYS);
      }}
      title={done ? "You're in" : "Join the Bohosaaz newsletter"}
      footer={
        done ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="primary" onClick={close}>
              Continue shopping
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              onClick={dontShowAgain}
            >
              Don&apos;t show again
            </button>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={busy}>
                Not now
              </Button>
              <Button variant="primary" onClick={submit} disabled={busy}>
                {busy ? "Joining…" : "Join"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="relative overflow-hidden rounded-3xl border border-border bg-background/60 p-5">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-muted/60 blur-3xl" />

        {done ? (
          <div className="relative">
            <div className="text-sm text-muted-foreground">Thanks for subscribing.</div>
            <div className="mt-2 font-heading text-xl tracking-tight">
              Exclusive drops and premium deals are on the way.
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Exclusive drops</div>
            <div className="mt-2 font-heading text-2xl tracking-tight">Limited offers • early access</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Get artisan stories, curated launches, and members-only coupon drops.
            </p>

            <div className="mt-5 grid gap-2">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn("h-11 rounded-2xl", error ? "border-destructive" : "")}
                inputMode="email"
                autoComplete="email"
              />
              {error ? <div className="text-xs text-destructive">{error}</div> : null}
              <div className="text-xs text-muted-foreground">
                You can unsubscribe anytime.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
