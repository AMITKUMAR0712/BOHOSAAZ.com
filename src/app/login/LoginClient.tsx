"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resolvePostLoginRedirect } from "@/lib/postLoginRedirect";
import { isLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgePercent, ShieldCheck, Truck } from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const next = search.get("next");

  const langPrefix = (() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg && isLocale(seg) ? `/${seg}` : "/en";
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Login failed");

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
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-5xl grid gap-6 md:grid-cols-2 md:gap-10 items-center">
        <div className="order-2 md:order-1">
          <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Welcome back</div>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">
            Sign in to continue
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-prose">
            Track orders, save favorites, and checkout faster.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="flex items-center gap-3 rounded-(--radius) border border-border bg-card/60 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm text-foreground">
                Secure login & protected checkout
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-(--radius) border border-border bg-card/60 px-4 py-3">
              <Truck className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm text-foreground">Order tracking and easy returns</div>
            </div>
            <div className="flex items-center gap-3 rounded-(--radius) border border-border bg-card/60 px-4 py-3">
              <BadgePercent className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm text-foreground">Exclusive deals & coupons</div>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <Card className="bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">Login</CardTitle>
              <CardDescription>Enter your details to access your account.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4">
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
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {err ? (
                  <div className="rounded-(--radius) border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {err}
                  </div>
                ) : null}

                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading ? "Signing in..." : "Login"}
                </Button>

                <div className="text-sm text-muted-foreground">
                  New here?{" "}
                  <Link
                    className="text-foreground underline underline-offset-4"
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
