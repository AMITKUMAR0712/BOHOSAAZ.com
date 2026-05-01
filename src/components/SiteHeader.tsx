"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { formatInr } from "@/lib/money";
import ThemeToggle from "@/components/ThemeToggle";
import * as LucideIcons from "lucide-react";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";

function renderNumericRuns(text: string) {
  const parts = String(text).split(/(\d[\d,\.]*)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((part, i) =>
      /\d/.test(part) ? (
        <span key={i} className="font-numeric tabular-nums">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
}

type Me = {
  user?: {
    role: "USER" | "VENDOR" | "ADMIN";
    email: string;
    vendor?: { status?: string | null } | null;
  };
} | null;

type Cart = {
  order: {
    id: string;
    total: number;
    items: Array<{ id: string; quantity: number; price: number }>;
  } | null;
} | null;

type NavCategory = { id: string; name: string; slug: string; iconName?: string | null; iconUrl?: string | null };

export default function SiteHeader({ lang }: { lang?: Locale } = {}) {
  const [me, setMe] = useState<Me>(null);
  const [cart, setCart] = useState<Cart>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currency: "INR" = "INR";

  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const catOpenT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catCloseT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const { toast } = useToast();

  const [scrolled, setScrolled] = useState(false);

  // Dashboards use their own chrome.
  const isDashboardRoute = (() => {
    const seg = pathname.split("/").filter(Boolean);
    const i = seg[0] && isLocale(seg[0]) ? 1 : 0;
    return seg[i] === "admin" || seg[i] === "vendor" || seg[i] === "account";
  })();

  // Sticky shadow on scroll
  useEffect(() => {
    if (isDashboardRoute) {
      setScrolled(false);
      return;
    }

    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDashboardRoute]);

  const detectedLang = (() => {
    if (lang) return lang;
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg && isLocale(seg) ? seg : ("en" as const);
  })();

  const lp = `/${detectedLang}`;

  async function loadMe() {
    setLoading(true);
    const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMe(null);
      setLoading(false);
      return;
    }
    setMe(data);
    setLoading(false);
  }

  async function loadCart() {
    const res = await fetch("/api/cart", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCart(null);
      return;
    }
    setCart(data);
  }

  async function loadWishlistCount() {
    const res = await fetch("/api/wishlist?count=1", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setWishlistCount(0);
      return;
    }

    const c = typeof data?.count === "number" ? data.count : 0;
    setWishlistCount(Math.max(0, Math.floor(c)));
  }

  async function loadCategories() {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const rows = Array.isArray(data?.categories) ? (data.categories as NavCategory[]) : [];
    setNavCategories(
      rows
        .filter((c) => c && typeof c === "object")
        .map((c) => {
          const row = c as unknown as {
            id?: unknown;
            name?: unknown;
            slug?: unknown;
            iconName?: unknown;
            iconUrl?: unknown;
          };
          return {
            id: String(row.id ?? ""),
            name: String(row.name ?? ""),
            slug: String(row.slug ?? ""),
            iconName: typeof row.iconName === "string" ? row.iconName : null,
            iconUrl: typeof row.iconUrl === "string" ? row.iconUrl : null,
          };
        })
        .filter((c) => c.name && c.slug)
        .slice(0, 15)
    );
  }

  function renderCategoryIcon(c: NavCategory) {
    if (c.iconUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={c.iconUrl} alt="" className="h-5 w-5 rounded bg-muted object-contain" loading="lazy" />;
    }
    if (!c.iconName) return <span className="h-5 w-5 rounded bg-muted" aria-hidden />;
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[c.iconName];
    if (!Icon) return <span className="h-5 w-5 rounded bg-muted" aria-hidden />;
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  }

  async function doLogout() {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
    });
    const data: unknown = await res.json().catch(() => ({}));

    try {
      localStorage.setItem("bohosaaz_auth_ts", String(Date.now()));
      window.dispatchEvent(new Event("bohosaaz-auth"));
    } catch {
      // ignore
    }

    await Promise.all([loadMe(), loadCart()]);
    toast({
      variant: "success",
      title: "Signed out",
      message: "You have been logged out.",
    });

    const redirectTo = (() => {
      if (data && typeof data === "object" && "redirectTo" in data) {
        const v = (data as { redirectTo?: unknown }).redirectTo;
        if (typeof v === "string") return v;
      }
      return lp;
    })();
    window.location.href = redirectTo;
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void loadMe();
      if (!isDashboardRoute) {
        void loadCart();
        void loadWishlistCount();
        void loadCategories();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [isDashboardRoute]);

  useEffect(() => {
    const onAuth = () => {
      void loadMe();
      if (!isDashboardRoute) {
        void loadCart();
        void loadWishlistCount();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "bohosaaz_auth_ts") onAuth();
    };

    window.addEventListener("bohosaaz-auth", onAuth as EventListener);
    window.addEventListener("bohosaaz-cart", loadCart as EventListener);
    window.addEventListener("bohosaaz-wishlist", loadWishlistCount as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bohosaaz-auth", onAuth as EventListener);
      window.removeEventListener("bohosaaz-cart", loadCart as EventListener);
      window.removeEventListener("bohosaaz-wishlist", loadWishlistCount as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [isDashboardRoute]);

  if (isDashboardRoute) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70">
        <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3">
          <Link href={lp} className="flex items-center gap-2 shrink-0">
            <div className="h-11 w-11 rounded-2xl border border-border bg-card grid place-items-center shadow-sm">
              <Image
                src="/mainlogo.jpeg"
                alt="Bohosaaz"
                width={56}
                height={56}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-heading text-base tracking-tight">Bohosaaz</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Marketplace</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {loading ? null : me?.user ? (
              <>
                <div className="hidden sm:block max-w-60 truncate text-sm text-muted-foreground">
                  {me.user.email}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-2xl"
                  onClick={() => void doLogout()}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link href={`${lp}/login`} className="h-10">
                <Button variant="outline" className="h-10 rounded-2xl">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  const role = me?.user?.role;
  const vendorStatus = me?.user?.vendor?.status ?? undefined;

  const sellerHref =
    role === "VENDOR" && vendorStatus === "APPROVED"
      ? `${lp}/vendor`
      : `${lp}/account/vendor-apply`;

  const cartItems = cart?.order?.items || [];
  const cartCount = cartItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );
  const cartTotal = Number(cart?.order?.total || 0);

  // Cart totals are stored in INR. Currency switch affects product display only.
  const cartSummary = formatInr(cartTotal);

  const walletHref = (() => {
    if (role === "VENDOR" && vendorStatus === "APPROVED") return `${lp}/vendor/wallet`;
    return `${lp}/account/wallet`;
  })();

  const navLinks = [
    { label: "Home", href: lp },
    { label: "About", href: `${lp}/about` },
    { label: "Contact", href: `${lp}/contact` },
    { label: "Seller", href: sellerHref },
    { label: "Blog", href: `${lp}/blog` },
    { label: "Latest", href: `${lp}?sort=latest` },
    { label: "Offers", href: `${lp}?sort=offer`, highlight: true },
  ];

  const categoryHref = (slug: string) => `${lp}/c/${encodeURIComponent(slug)}`;

  function clearCatTimers() {
    if (catOpenT.current) {
      clearTimeout(catOpenT.current);
      catOpenT.current = null;
    }
    if (catCloseT.current) {
      clearTimeout(catCloseT.current);
      catCloseT.current = null;
    }
  }

  function scheduleCatOpen() {
    if (catOpen) return;
    clearCatTimers();
    catOpenT.current = setTimeout(() => setCatOpen(true), 200);
  }

  function scheduleCatClose() {
    clearCatTimers();
    catCloseT.current = setTimeout(() => setCatOpen(false), 450);
  }

  const Icon = {
    Menu: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    Search: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16.5 16.5 21 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    User: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M20 21a8 8 0 0 0-16 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    Heart: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20s-7-4.5-9.2-9A5.4 5.4 0 0 1 12 5.7 5.4 5.4 0 0 1 21.2 11C19 15.5 12 20 12 20Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
    Cart: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6h15l-1.5 8.5H7.2L6 6Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M6 6 5 3H2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          fill="currentColor"
        />
      </svg>
    ),
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70 transition-shadow ${
        scrolled ? "shadow-[0_10px_30px_rgba(0,0,0,0.07)]" : ""
      }`}
    >
      {/* ✅ Compact Top Strip */}
      <div className="hidden md:block border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground/80">Bohosaaz</span>
            <span className="opacity-50">•</span>
            <span className="tracking-[0.12em]">Crafted with care</span>
          </div>
        </div>
      </div>

      {/* ✅ MAIN ROW (Brand + Search + Actions) */}
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-3">
        {/* Brand */}
        <Link href={lp} className="flex items-center gap-2 shrink-0 group">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border border-border bg-card grid place-items-center shadow-sm group-hover:shadow-md transition">
            <Image
              src="/mainlogo.jpeg"
              alt="Bohosaaz"
              width={66}
              height={66}
              className="h-11 w-11 sm:h-13 sm:w-13 object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="font-heading text-base tracking-tight group-hover:text-primary transition">
              Bohosaaz
            </div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">
              Discover & Buy
            </div>
          </div>
        </Link>

        {/* Category Dropdown */}
        <div
          className="relative hidden md:block"
          onMouseEnter={scheduleCatOpen}
          onMouseLeave={scheduleCatClose}
        >
          <button
            type="button"
            className="h-10 rounded-2xl bg-primary text-primary-foreground px-4 hover:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-haspopup="menu"
            aria-expanded={catOpen}
            onFocus={() => {
              clearCatTimers();
              setCatOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCatOpen(false);
              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") setCatOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-2">
              {Icon.Menu}
              <span className="text-[12px] tracking-widest uppercase">Shop by Category</span>
            </span>
          </button>

          {catOpen ? (
            <div
              className="absolute left-0 top-full mt-2 w-130 rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-premium p-5"
              role="menu"
              onKeyDown={(e) => {
                if (e.key === "Escape") setCatOpen(false);
              }}
              onMouseEnter={() => {
                clearCatTimers();
                setCatOpen(true);
              }}
              onMouseLeave={scheduleCatClose}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Categories
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1">
                {navCategories.length ? (
                  navCategories.map((c) => (
                    <Link
                      key={c.id}
                      href={categoryHref(c.slug)}
                      className="rounded-2xl px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition"
                      role="menuitem"
                      onClick={() => setCatOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        {renderCategoryIcon(c)}
                        <span>{c.name}</span>
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-2 rounded-2xl border border-border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                    Loading categories…
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`${lp}/latest`}
                  className="text-sm text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline"
                  onClick={() => setCatOpen(false)}
                >
                  Browse latest
                </Link>
                <Link
                  href={`${lp}/offers`}
                  className="text-sm text-primary hover:brightness-95 transition underline-offset-4 hover:underline"
                  onClick={() => setCatOpen(false)}
                >
                  View offers →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* Search */}
        <form
          className="flex-1 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") || "").trim();
            window.location.href = q ? `${lp}?q=${encodeURIComponent(q)}` : lp;
          }}
        >
          <Input
            name="q"
            placeholder="Search products..."
            className="h-10 rounded-2xl"
          />
          <Button
            type="submit"
            variant="primary"
            className="h-10 px-4 rounded-2xl"
            aria-label="Search"
          >
            {Icon.Search}
          </Button>
        </form>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link
            href={
              me?.user
                ? `${lp}/account/wishlist`
                : `${lp}/login?next=${encodeURIComponent(`${lp}/account/wishlist`)}`
            }
            className="relative h-10 w-10 grid place-items-center rounded-2xl border border-border bg-card hover:bg-muted/50 transition"
            aria-label="Wishlist"
          >
            {Icon.Heart}

            {wishlistCount > 0 ? (
              <span className="absolute -top-2 -right-2 h-6 min-w-6 px-2 rounded-full bg-danger text-danger-foreground text-xs grid place-items-center">
                <span className="font-numeric tabular-nums">{wishlistCount}</span>
              </span>
            ) : null}
          </Link>

          {/* Auth */}
          {loading ? null : me?.user ? (
            <Dropdown>
              <DropdownTrigger className="h-10 w-10 grid place-items-center rounded-2xl border border-border bg-card hover:bg-muted/50 transition" aria-label="Profile">
                {Icon.User}
              </DropdownTrigger>
              <DropdownContent className="w-64">
                <div className="px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">Signed in as</div>
                  <div className="text-sm font-semibold truncate">{me.user.email}</div>
                </div>
                <DropdownSeparator />
                {role === "ADMIN" ? (
                  <DropdownItem onSelect={() => (window.location.href = `${lp}/admin/dashboard`)}>
                    Admin Dashboard
                  </DropdownItem>
                ) : role === "VENDOR" ? (
                  <>
                    <DropdownItem onSelect={() => (window.location.href = `${lp}/vendor/dashboard`)}>
                      Vendor Dashboard
                    </DropdownItem>
                    {vendorStatus === "APPROVED" ? (
                      <DropdownItem onSelect={() => (window.location.href = walletHref)}>
                        Wallet
                      </DropdownItem>
                    ) : null}
                  </>
                ) : (
                  <>
                    <DropdownItem onSelect={() => (window.location.href = `${lp}/account`)}>
                      My Account
                    </DropdownItem>
                    <DropdownItem onSelect={() => (window.location.href = `${lp}/account/orders`)}>
                      Orders
                    </DropdownItem>
                    <DropdownItem onSelect={() => (window.location.href = walletHref)}>
                      Wallet
                    </DropdownItem>
                  </>
                )}
                <DropdownSeparator />
                <DropdownItem
                  onSelect={async () => {
                    await doLogout();
                  }}
                >
                  Logout
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href={`${lp}/login`} className="h-10">
                <Button variant="outline" className="h-10 rounded-2xl">
                  Login
                </Button>
              </Link>
              <Link href={`${lp}/register`} className="h-10">
                <Button variant="primary" className="h-10 rounded-2xl">
                  Create Account
                </Button>
              </Link>
            </div>
          )}

          {/* Cart */}
          <Link
            href={`${lp}/cart`}
            className="relative h-10 inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 shadow-md hover:brightness-95 transition"
          >
            {Icon.Cart}
            <span className="text-[12px] tracking-widest uppercase">
              {renderNumericRuns(cartSummary)}
            </span>

            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 h-6 min-w-6 px-2 rounded-full bg-destructive text-white text-xs grid place-items-center">
                <span className="font-numeric tabular-nums">{cartCount}</span>
              </span>
            )}
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2 shrink-0">
          <Link
            href={`${lp}/cart`}
            className="relative h-10 inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-3"
          >
            {Icon.Cart}
            <span className="text-xs font-semibold font-numeric tabular-nums">{cartCount}</span>
          </Link>
          <Button
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={() => setDrawerOpen(true)}
          >
            {Icon.Menu}
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>

      {/* ✅ Compact Scrollable Links instead of Row D */}
      <div className="border-t border-border bg-muted/10">
        <div className="mx-auto max-w-6xl px-4 py-1.5">
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-muted-foreground scrollbar-hide">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`transition hover:text-foreground ${
                  l.highlight
                    ? "text-primary underline underline-offset-4"
                    : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Menu">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Preferences</div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <ThemeToggle />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Cart
            </div>
            <div className="mt-1 font-heading text-lg text-primary">
              {renderNumericRuns(cartSummary)}
            </div>
            <Link
              href={`${lp}/cart`}
              className="mt-2 inline-block text-sm text-primary underline underline-offset-4"
            >
              View cart
            </Link>
          </div>

          {loading ? null : me?.user ? (
            <div className="rounded-2xl border border-border bg-card/70 p-2">
              <div className="px-2 py-2 text-xs uppercase tracking-widest text-muted-foreground">
                Account
              </div>
              {role === "ADMIN" ? (
                <Link href={`${lp}/admin/dashboard`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                  Admin Dashboard
                </Link>
              ) : role === "VENDOR" ? (
                <>
                  <Link href={`${lp}/vendor/dashboard`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                    Vendor Dashboard
                  </Link>
                  {vendorStatus === "APPROVED" ? (
                    <Link href={walletHref} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                      Wallet
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link href={`${lp}/account`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                    My Account
                  </Link>
                  <Link href={`${lp}/account/orders`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                    Orders
                  </Link>
                  <Link href={walletHref} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                    Wallet
                  </Link>
                </>
              )}
              <button
                type="button"
                className="w-full text-left rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition"
                onClick={() => void doLogout()}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/70 p-2">
              <div className="px-2 py-2 text-xs uppercase tracking-widest text-muted-foreground">
                Account
              </div>
              <Link href={`${lp}/login`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                Login
              </Link>
              <Link href={`${lp}/register`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition">
                Create Account
              </Link>
            </div>
          )}

          <div className="grid gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <details className="rounded-2xl border border-border bg-card/70 overflow-hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
              Shop by Category
            </summary>
            <div className="p-2 grid gap-1">
              {navCategories.slice(0, 15).map((c) => (
                <Link
                  key={c.id}
                  href={categoryHref(c.slug)}
                  className="rounded-2xl px-4 py-2 text-sm hover:bg-muted/40 transition"
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    {renderCategoryIcon(c)}
                    <span>{c.name}</span>
                  </span>
                </Link>
              ))}
              {navCategories.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Loading categories…</div>
              ) : null}
            </div>
          </details>
        </div>
      </Drawer>
    </header>
  );
}
