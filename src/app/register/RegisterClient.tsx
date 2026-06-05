"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolvePostLoginRedirect } from "@/lib/postLoginRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Heart, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";

export default function RegisterClient({
  langPrefix,
  next,
}: {
  langPrefix: string;
  next: string | null;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const vendorNext = `${langPrefix}/account/vendor-apply`;
  const vendorLoginHref = `${langPrefix}/login?next=${encodeURIComponent(vendorNext)}`;
  const startsAsVendor = next === vendorNext || next === "/account/vendor-apply";
  const [accountType, setAccountType] = useState<"user" | "vendor">(() => (startsAsVendor ? "vendor" : "user"));
  const vendorFlowActive = accountType === "vendor";

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

      const target = await resolvePostLoginRedirect({ next: vendorFlowActive ? vendorNext : next });

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
    <main className="compact-content-page compact-auth-page relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-6 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-3 overflow-hidden rounded-[30px] border border-border/70 bg-card/55 p-3 shadow-premium backdrop-blur-2xl md:grid-cols-2 md:gap-4 md:p-4">
        <div className="order-2 md:order-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            {vendorFlowActive ? "Create vendor account" : "Join Bohosaaz gifting"}
          </div>
          <h1 className="mt-2 max-w-xl font-heading text-3xl leading-tight tracking-tight text-foreground md:text-[2.35rem]">
            {vendorFlowActive ? "Create your seller account and start vendor application." : "Create an account for gifts people will remember."}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {vendorFlowActive
              ? "First create your account, then fill shop, bank and KYC details. Until admin approval, products and vendor dashboard stay locked."
              : "Save handpicked gifts, build wishlists, get faster checkout, and keep every celebration beautifully organized."}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3 md:grid-cols-1">
            <div className="group flex items-center gap-3 rounded-3xl border border-border bg-background/70 px-4 py-2 shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-sm font-medium text-foreground">Curated gifts by occasion</div>
            </div>
            <div className="group flex items-center gap-3 rounded-3xl border border-border bg-background/70 px-4 py-2 shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Heart className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-sm font-medium text-foreground">Wishlist for every person</div>
            </div>
            <div className="group flex items-center gap-3 rounded-3xl border border-border bg-background/70 px-4 py-2 shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-sm font-medium text-foreground">Fast checkout and tracking</div>
            </div>
          </div>

          <div className="mt-3 rounded-[24px] border border-border bg-background/60 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="font-heading text-base text-foreground">A premium gifting account</div>
                <p className="mt-1 text-xs text-muted-foreground">Save favorites, manage orders and shop meaningful gifts faster.</p>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-[26px] border border-primary/20 bg-linear-to-br from-primary/12 via-background/70 to-amber-500/10 p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Store className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="font-heading text-base text-foreground">Create account as vendor</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Select vendor role, create account, submit all shop/KYC details, then wait for admin approval.
                </p>
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
              <CardTitle className="font-heading text-xl">
                {vendorFlowActive ? "Create your vendor account" : "Create your gifting account"}
              </CardTitle>
              <CardDescription>
                {vendorFlowActive
                  ? "After signup, you will continue to the vendor details and KYC form."
                  : "Start saving gifts for birthdays, weddings, festivals and every special person."}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 md:p-5">
              <form onSubmit={onSubmit} className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAccountType("user")}
                    className={
                      "rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm " +
                      (accountType === "user"
                        ? "border-primary/45 bg-primary/10 text-foreground"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground")
                    }
                  >
                    <span className="block text-xs uppercase tracking-[0.18em]">User Account</span>
                    <span className="mt-1 block text-sm font-semibold">Shop, wishlist and orders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("vendor")}
                    className={
                      "rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm " +
                      (accountType === "vendor"
                        ? "border-primary/45 bg-primary/10 text-foreground"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground")
                    }
                  >
                    <span className="block text-xs uppercase tracking-[0.18em]">Vendor Account</span>
                    <span className="mt-1 block text-sm font-semibold">Sell after admin approval</span>
                  </button>
                </div>

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
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    required
                  />
                </div>

                {err ? (
                  <div className="rounded-(--radius) border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {err}
                  </div>
                ) : null}

                <Button type="submit" size="lg" disabled={loading} className="w-full rounded-2xl uppercase tracking-[0.14em]">
                  {loading ? "Creating..." : vendorFlowActive ? "Create vendor account" : "Start gifting"}
                </Button>

                {!vendorFlowActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full rounded-2xl uppercase tracking-[0.14em]"
                    onClick={() => setAccountType("vendor")}
                  >
                    Create account for vendor
                  </Button>
                ) : null}

                <div className="rounded-2xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    className="font-semibold text-primary underline underline-offset-4"
                    href={
                      vendorFlowActive
                        ? vendorLoginHref
                        : next
                        ? `${langPrefix}/login?next=${encodeURIComponent(next)}`
                        : `${langPrefix}/login`
                    }
                  >
                    {vendorFlowActive ? "Vendor login" : "Login"}
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
