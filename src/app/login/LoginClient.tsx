"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolvePostLoginRedirect } from "@/lib/postLoginRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Heart, ShieldCheck, Sparkles, Truck } from "lucide-react";

export default function LoginClient({
  langPrefix,
  next,
}: {
  langPrefix: string;
  next: string | null;
}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBlockedReason(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "ACCOUNT_BLOCKED" || res.status === 403) {
          const reason =
            typeof data?.blockedReason === "string" && data.blockedReason.trim()
              ? data.blockedReason.trim()
              : typeof data?.error === "string"
                ? data.error
                : "Your account has been blocked.";
          setBlockedReason(reason);
          throw new Error("Account blocked");
        }
        throw new Error(typeof data?.error === "string" ? data.error : "Login failed");
      }

      const target = await resolvePostLoginRedirect({ next });

      try {
        localStorage.setItem("bohosaaz_auth_ts", String(Date.now()));
        window.dispatchEvent(new Event("bohosaaz-auth"));
      } catch {
        // ignore
      }

      router.replace(target);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      if (message !== "Account blocked") setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="compact-content-page compact-auth-page relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-6 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-3 overflow-hidden rounded-[30px] border border-border/70 bg-card/55 p-3 shadow-premium backdrop-blur-2xl md:grid-cols-2 md:gap-4 md:p-4">
        <div className="order-2 md:order-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            Welcome back to gifting
          </div>
          <h1 className="mt-2 max-w-xl font-heading text-3xl leading-tight tracking-tight text-foreground md:text-[2.35rem]">
            Pick gifts that feel personal, premium and unforgettable.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Sign in to continue your gifting journey, save thoughtful picks, track orders, and checkout faster for every celebration.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3 md:grid-cols-1">
            <div className="group flex items-center gap-3 rounded-3xl border border-border bg-background/70 px-4 py-2 shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-sm font-medium text-foreground">Gift-ready curated finds</div>
            </div>
            <div className="group flex items-center gap-3 rounded-3xl border border-border bg-background/70 px-4 py-2 shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-sm font-medium text-foreground">Track every special delivery</div>
            </div>
            <div className="group flex items-center gap-3 rounded-3xl border border-border bg-background/70 px-4 py-2 shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-sm font-medium text-foreground">Secure premium checkout</div>
            </div>
          </div>

          <div className="mt-3 rounded-[24px] border border-border bg-background/60 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <Heart className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="font-heading text-base text-foreground">Saved gifts wait for you</div>
                <p className="mt-1 text-xs text-muted-foreground">Wishlist and cart help you finish gifting faster.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <Card className="overflow-hidden rounded-[30px] border-border/80 bg-card/90 shadow-premium backdrop-blur-xl">
            <CardHeader className="p-4 pb-0 md:p-5 md:pb-0">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-6 w-6" aria-hidden />
              </div>
              {blockedReason ? (
                <>
                  <CardTitle className="font-heading text-xl text-danger">Account blocked</CardTitle>
                  <h2 className="mt-3 font-heading text-2xl leading-snug tracking-tight text-foreground md:text-3xl">
                    {blockedReason}
                  </h2>
                  <CardDescription className="mt-2">
                    Please contact support if you believe this is a mistake.
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="font-heading text-xl">Login and start gifting</CardTitle>
                  <CardDescription>Access wishlist, cart and premium gift recommendations.</CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent className="p-4 md:p-5">
              <form onSubmit={onSubmit} className="grid gap-3">
                <div className="grid gap-2">
                  <label className="text-xs tracking-[0.22em] uppercase text-muted-foreground">
                    Email
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs tracking-[0.22em] uppercase text-muted-foreground">
                      Password
                    </label>
                    <Link
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                      href={`${langPrefix}/forgot-password`}
                    >
                      Forgot?
                    </Link>
                  </div>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {err ? (
                  <div className="rounded-(--radius) border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {err}
                  </div>
                ) : null}

                <Button type="submit" size="lg" disabled={loading} className="w-full rounded-2xl uppercase tracking-[0.14em]">
                  {loading ? "Signing in..." : "Continue to gifts"}
                </Button>

                <div className="rounded-2xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  New here?{" "}
                  <Link
                    className="font-semibold text-primary underline underline-offset-4"
                    href={
                      next
                        ? `${langPrefix}/register?next=${encodeURIComponent(next)}`
                        : `${langPrefix}/register`
                    }
                  >
                    Create account
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
