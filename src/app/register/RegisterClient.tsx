"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resolvePostLoginRedirect } from "@/lib/postLoginRedirect";
import { isLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ShieldCheck, Sparkles } from "lucide-react";

export default function RegisterClient() {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const next = search.get("next");

  const langPrefix = (() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg && isLocale(seg) ? `/${seg}` : "/en";
  })();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Registration failed");

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
          <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Join Bohosaaz</div>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-prose">
            Save products, manage orders, and get personalized recommendations.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="flex items-center gap-3 rounded-(--radius) border border-border bg-card/60 px-4 py-3">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm text-foreground">Personalized shopping experience</div>
            </div>
            <div className="flex items-center gap-3 rounded-(--radius) border border-border bg-card/60 px-4 py-3">
              <Heart className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm text-foreground">Wishlist & quick re-order</div>
            </div>
            <div className="flex items-center gap-3 rounded-(--radius) border border-border bg-card/60 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              <div className="text-sm text-foreground">Secure account & privacy-first</div>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <Card className="bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">Create account</CardTitle>
              <CardDescription>It only takes a minute.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-xs tracking-[0.22em] uppercase text-muted-foreground">
                    Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>

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
                  <label className="text-xs tracking-[0.22em] uppercase text-muted-foreground">
                    Password
                  </label>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                {err ? (
                  <div className="rounded-(--radius) border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {err}
                  </div>
                ) : null}

                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Register"}
                </Button>

                <div className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    className="text-foreground underline underline-offset-4"
                    href={
                      next
                        ? `${langPrefix}/login?next=${encodeURIComponent(next)}`
                        : `${langPrefix}/login`
                    }
                  >
                    Login
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
