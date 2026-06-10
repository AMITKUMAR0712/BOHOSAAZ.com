"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { formatMoney } from "@/lib/money";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySwitch from "@/components/CurrencySwitch";
import { useCurrency } from "@/lib/currency-context";
import { getPriceInCurrency } from "@/lib/currency-utils";
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
    currency?: "INR" | "USD";
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      product: { currency: "INR" | "USD" };
    }>;
  } | null;
} | null;

type NavCategory = {
  id: string;
  name: string;
  slug: string;
  iconName?: string | null;
  iconUrl?: string | null;
  children?: NavCategory[];
};

export default function SiteHeader({ lang }: { lang?: Locale } = {}) {
  const [me, setMe] = useState<Me>(null);
  const [cart, setCart] = useState<Cart>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const catOpenT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catCloseT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currency: selectedCurrency, setCurrency } = useCurrency();
  const router = useRouter();

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
        .map(normalizeNavCategory)
        .filter((c) => c.name && c.slug)
        .slice(0, 12)
    );
  }

  function normalizeNavCategory(c: unknown): NavCategory {
    const row = c as {
      id?: unknown;
      name?: unknown;
      slug?: unknown;
      iconName?: unknown;
      iconUrl?: unknown;
      children?: unknown;
    };
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      iconName: typeof row.iconName === "string" ? row.iconName : null,
      iconUrl: typeof row.iconUrl === "string" ? row.iconUrl : null,
      children: Array.isArray(row.children)
        ? row.children.map(normalizeNavCategory).filter((child) => child.name && child.slug)
        : [],
    };
  }

  function renderCategoryIcon(c: NavCategory) {
    if (c.iconUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={c.iconUrl} alt="" className="h-4 w-4 rounded bg-muted object-contain" loading="lazy" />;
    }
    if (!c.iconName) return <span className="h-4 w-4 rounded bg-muted" aria-hidden />;
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[c.iconName];
    if (!Icon) return <span className="h-4 w-4 rounded bg-muted" aria-hidden />;
    return <Icon className="h-4 w-4 text-primary/80" />;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (e.key === "bohosaaz_cart_ts" && !isDashboardRoute) void loadCart();
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

  useEffect(() => {
    if (isDashboardRoute || !me?.user) return;
    if (typeof window === "undefined" || !("EventSource" in window)) return;

    const refreshAccountState = () => {
      void loadCart();
      void loadWishlistCount();
    };

    const es = new EventSource("/api/live?role=user", { withCredentials: true });
    es.addEventListener("metrics", refreshAccountState);
    es.onerror = () => {
      es.close();
    };

    return () => {
      es.removeEventListener("metrics", refreshAccountState);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDashboardRoute, me?.user?.email]);

  if (isDashboardRoute) {
    return (
      <>
        <style>{`
          main.site-content {
            --site-header-offset: 76px;
          }
        `}</style>
        <header className="fixed inset-x-0 top-0 z-999 w-full border-b border-border/70 bg-background/92 shadow-[0_12px_40px_rgba(47,38,34,0.08)] backdrop-blur-2xl supports-backdrop-filter:bg-background/80">
          <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3">
            <Link href={lp} className="flex items-center gap-2 shrink-0">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 border-primary/25 bg-card shadow-[0_10px_30px_rgba(135,56,20,0.18),0_0_0_5px_rgba(184,134,50,0.08)]">
                <Image
                  src="/logo copy.jpeg"
                  alt="Bohosaaz"
                  width={72}
                  height={72}
                  className="h-12 w-12 rounded-full object-contain"
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
      </>
    );
  }

  const role = me?.user?.role;

  const cartItems = cart?.order?.items || [];
  const cartCount = cartItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );
  const cartOrderCurrency = cart?.order?.currency === "USD" ? "USD" : "INR";
  const cartTotal = cartCount > 0 ? Number(cart?.order?.total || 0) : 0;
  const cartSummary = formatMoney(
    selectedCurrency,
    getPriceInCurrency(cartTotal, cartOrderCurrency, selectedCurrency),
  );

  const navLinks = [
    { label: "Home", href: lp },
    { label: "Shop All", href: `${lp}/shop` },
    { label: "Gift Categories", href: `${lp}/categories` },
    { label: "About Us", href: `${lp}/about` },
    { label: "Contact Us", href: `${lp}/contact` },
    { label: "Blogs", href: `${lp}/blog` },
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
    <>
    <header
      className={`fixed inset-x-0 top-0 z-999 w-full border-b border-primary/15 bg-background/88 backdrop-blur-2xl supports-backdrop-filter:bg-background/80 transition-all duration-300 ${
        !isDashboardRoute && scrolled
          ? "shadow-[0_22px_70px_rgba(47,38,34,0.18)] ring-1 ring-primary/15"
          : "shadow-[0_12px_45px_rgba(47,38,34,0.09)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent" />
      {/* ✅ MAIN ROW (Brand + Search + Actions) */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 lg:flex-nowrap">
        {/* Brand */}
        <Link href={lp} className="flex shrink-0 items-center gap-2 group">
          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-primary/25 bg-card/95 shadow-[0_12px_34px_rgba(135,56,20,0.20),0_0_0_5px_rgba(184,134,50,0.09)] transition duration-300 ease-out group-hover:scale-105 group-hover:border-primary/45 group-hover:shadow-premium sm:h-16 sm:w-16">
            <Image
              src="/logo copy.jpeg"
              alt="Bohosaaz"
              width={72}
              height={72}
              className="h-10 w-10 rounded-full object-contain sm:h-14 sm:w-14"
              priority
            />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="font-heading text-base tracking-tight group-hover:text-primary transition">
              Bohosaaz
            </div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">
              Art of meaningful gifting
            </div>
          </div>
        </Link>

        {/* Category Dropdown */}
        <div
          className="relative hidden shrink-0 lg:block"
          onMouseEnter={scheduleCatOpen}
          onMouseLeave={scheduleCatClose}
        >
          <button
            type="button"
            className="h-10 rounded-2xl bg-primary text-primary-foreground px-4 shadow-(--shadowBtn) hover:-translate-y-px hover:brightness-95 hover:shadow-(--shadowBtnHover) transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              className="absolute left-0 top-full z-100 mt-2 max-h-[min(70vh,30rem)] w-[min(31rem,calc(100vw-2rem))] overflow-y-auto rounded-[26px] bg-card/96 p-3.5 shadow-[0_22px_70px_rgba(47,38,34,0.18)] backdrop-blur-2xl"
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
              <div className="px-1 text-[10px] uppercase tracking-[0.26em] text-primary/80">
                Categories
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {navCategories.length ? (
                  navCategories.map((c) => (
                    <div
                      key={c.id}
                      className="min-w-0 rounded-[18px] bg-background/50 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] transition hover:bg-background/70"
                    >
                      <Link
                        href={categoryHref(c.slug)}
                        className="flex min-w-0 items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-[13px] font-semibold text-foreground transition hover:bg-primary/8 hover:text-primary"
                        role="menuitem"
                        onClick={() => setCatOpen(false)}
                      >
                        {renderCategoryIcon(c)}
                        <span className="truncate">{c.name}</span>
                      </Link>
                      {c.children?.length ? (
                        <div className="mt-0.5 grid gap-0.5 pl-8">
                          {c.children.slice(0, 4).map((child) => (
                            <Link
                              key={child.id}
                              href={categoryHref(child.slug)}
                              className="truncate rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/40 hover:text-primary"
                              role="menuitem"
                              onClick={() => setCatOpen(false)}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-2xl bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                    Loading categories…
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-end px-1">
                <Link
                  href={`${lp}/categories`}
                  className="text-xs font-semibold text-primary transition hover:brightness-95 hover:underline"
                  onClick={() => setCatOpen(false)}
                >
                  View all →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* Search */}
        <form
          className="order-3 flex w-full min-w-0 flex-1 items-center gap-2 sm:w-auto md:min-w-56 lg:order-0"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") || "").trim();
            window.location.href = q ? `${lp}?q=${encodeURIComponent(q)}` : lp;
          }}
        >
          <Input
            name="q"
            placeholder="Search gifts, brands, occasions..."
            className="h-11 rounded-2xl bg-background/80 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_24px_rgba(47,38,34,0.08)] sm:h-10"
          />
          <Button
            type="submit"
            variant="primary"
            className="h-11 rounded-2xl px-4 sm:h-10"
            aria-label="Search"
          >
            {Icon.Search}
          </Button>
        </form>

        {/* Actions */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <ThemeToggle />
          <CurrencySwitch />
          <Link
            href={
              me?.user
                ? `${lp}/account/wishlist`
                : `${lp}/login?next=${encodeURIComponent(`${lp}/account/wishlist`)}`
            }
            className="relative h-10 w-10 grid place-items-center rounded-2xl border border-primary/10 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-px hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
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
              <DropdownTrigger className="h-10 w-10 grid place-items-center rounded-2xl border border-primary/10 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-px hover:border-primary/30 hover:bg-muted/50 hover:shadow-md" aria-label="Profile">
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
                  </>
                ) : (
                  <>
                    <DropdownItem onSelect={() => (window.location.href = `${lp}/account`)}>
                      My Account
                    </DropdownItem>
                    <DropdownItem onSelect={() => (window.location.href = `${lp}/account/orders`)}>
                      Orders
                    </DropdownItem>
                    <DropdownItem onSelect={() => (window.location.href = `${lp}/account/wishlist`)}>
                      Wishlist
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
            className="relative h-10 inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 shadow-(--shadowBtn) transition hover:-translate-y-px hover:brightness-95 hover:shadow-(--shadowBtnHover)"
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
        <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
          <Link
            href={`${lp}/cart`}
            className="relative h-11 touch-target inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-3 shadow-(--shadowBtn)"
          >
            {Icon.Cart}
            <span className="text-xs font-semibold font-numeric tabular-nums">{cartCount}</span>
          </Link>
          <Button
            variant="outline"
            className="h-11 rounded-2xl px-3"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
          >
            {Icon.Menu}
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>

      {/* ✅ Compact Scrollable Links instead of Row D */}
      <div className="hidden border-t border-primary/10 bg-card/40 backdrop-blur-2xl sm:block">
        <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4">
          <div className="mobile-scroll items-center whitespace-nowrap sm:flex sm:flex-wrap sm:justify-start sm:overflow-visible">
            {navLinks.map((l) => {
              const active =
                l.href === lp
                  ? pathname === lp || pathname === `${lp}/`
                  : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`relative shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/25 hover:bg-primary/10 hover:text-primary hover:shadow-md sm:py-1.5 sm:text-[12px] ${
                    active
                      ? "border-primary/25 bg-primary/10 text-primary after:absolute after:-bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-primary"
                      : "border-transparent bg-background/30 text-foreground/85"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ✅ Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Bohosaaz Menu" mobileTopOffset>
        <div className="grid gap-4">
          <form
            className="flex items-center gap-2 rounded-3xl bg-background/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") || "").trim();
              setDrawerOpen(false);
              window.location.href = q ? `${lp}/shop?q=${encodeURIComponent(q)}` : `${lp}/shop`;
            }}
          >
            <Input name="q" placeholder="Search products..." className="rounded-2xl bg-card/90" />
            <Button type="submit" className="rounded-2xl px-4" aria-label="Search">
              {Icon.Search}
            </Button>
          </form>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Shop", href: `${lp}/shop` },
              { label: "Categories", href: `${lp}/categories` },
              { label: "Contact", href: `${lp}/contact` },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="grid min-h-16 place-items-center rounded-2xl bg-primary/10 px-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-primary"
                onClick={() => setDrawerOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Preferences</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <ThemeToggle />
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-background/70 p-1 shadow-sm">
                {(["INR", "USD"] as const).map((nextCurrency) => (
                  <button
                    key={nextCurrency}
                    type="button"
                    className={`h-10 rounded-xl px-3 text-sm font-bold transition ${
                      selectedCurrency === nextCurrency
                        ? "bg-primary text-primary-foreground shadow-(--shadowBtn)"
                        : "bg-card/70 text-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setCurrency(nextCurrency);
                      router.refresh();
                    }}
                    aria-pressed={selectedCurrency === nextCurrency}
                  >
                    {nextCurrency}
                  </button>
                ))}
              </div>
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
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-(--shadowBtn)"
              onClick={() => setDrawerOpen(false)}
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
                <Link href={`${lp}/admin/dashboard`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                  Admin Dashboard
                </Link>
              ) : role === "VENDOR" ? (
                <>
                  <Link href={`${lp}/vendor/dashboard`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                    Vendor Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href={`${lp}/account`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                    My Account
                  </Link>
                  <Link href={`${lp}/account/orders`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                    Orders
                  </Link>
                  <Link href={`${lp}/account/wishlist`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                    Wishlist
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
              <Link href={`${lp}/login`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                Login
              </Link>
              <Link href={`${lp}/register`} className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted/40 transition" onClick={() => setDrawerOpen(false)}>
                Create Account
              </Link>
            </div>
          )}

          <div className="grid gap-1">
            {navLinks.map((l) => {
              const active =
                l.href === lp
                  ? pathname === lp || pathname === `${lp}/`
                  : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] transition ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"
                  }`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <details className="rounded-2xl border border-border bg-card/70 overflow-hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
              Shop by Category
            </summary>
            <div className="p-2 grid gap-1">
              {navCategories.slice(0, 15).map((c) => (
                <div key={c.id} className="rounded-2xl bg-background/35 p-1">
                  <Link
                    href={categoryHref(c.slug)}
                    className="rounded-2xl px-3 py-2 text-sm font-semibold hover:bg-muted/40 transition"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      {renderCategoryIcon(c)}
                      <span>{c.name}</span>
                    </span>
                  </Link>
                  {c.children?.length ? (
                    <div className="grid gap-1 pl-9">
                      {c.children.slice(0, 8).map((child) => (
                        <Link
                          key={child.id}
                          href={categoryHref(child.slug)}
                          className="rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition"
                          onClick={() => setDrawerOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {navCategories.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Loading categories…</div>
              ) : null}
              <Link
                href={`${lp}/categories`}
                className="mt-2 block rounded-2xl px-4 py-3 text-sm font-semibold text-primary hover:bg-muted/40 transition"
                onClick={() => setDrawerOpen(false)}
              >
                View all categories →
              </Link>
            </div>
          </details>
        </div>
      </Drawer>
    </header>
    <nav
        className={`fixed inset-x-0 bottom-0 z-1000 border-t border-primary/20 bg-card/96 px-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-1.5 shadow-[0_-20px_60px_rgba(47,38,34,0.18),0_0_0_1px_rgba(135,56,20,0.08)] backdrop-blur-2xl md:hidden ${
          drawerOpen ? "hidden" : ""
        }`}
        aria-label="Mobile quick navigation"
      >
        <div className="mx-auto grid max-w-[min(26rem,calc(100vw-0.75rem))] grid-cols-5 gap-1 rounded-[22px] bg-background/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          {[
            { label: "Home", href: lp, icon: "⌂" },
            { label: "Shop", href: `${lp}/shop`, icon: "⌕" },
            {
              label: "Wishlist",
              href: me?.user ? `${lp}/account/wishlist` : `${lp}/login?next=${encodeURIComponent(`${lp}/account/wishlist`)}`,
              icon: "♡",
              count: wishlistCount,
            },
            { label: "Account", href: me?.user ? `${lp}/account` : `${lp}/login`, icon: "◎" },
            { label: "Cart", href: `${lp}/cart`, icon: "🛒", count: cartCount },
          ].map((item) => {
            const active =
              item.href === lp
                ? pathname === lp || pathname === `${lp}/`
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex min-h-12 flex-col items-center justify-center rounded-[17px] px-0.5 text-[9px] font-bold transition sm:min-h-14 sm:rounded-[20px] sm:px-1 sm:text-[10px] ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(135,56,20,0.25)]"
                    : "bg-card/70 text-foreground/80 shadow-sm hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[15px] leading-none transition sm:h-7 sm:w-7 sm:text-[17px] ${
                    active ? "bg-primary-foreground/18 text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span className="mt-0.5 truncate">{item.label}</span>
                {item.count && item.count > 0 ? (
                  <span className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] text-danger-foreground">
                    <span className="font-numeric tabular-nums">{item.count}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
    </nav>
    </>
  );
}
