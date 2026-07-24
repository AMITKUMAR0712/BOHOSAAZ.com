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
import { publicCmsPath } from "@/lib/cmsSlug";

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

type CmsNavChild = {
  id: string;
  slug: string;
  title: string;
  group: "about" | "contact" | "blog";
};

type NavLink = {
  label: string;
  href: string;
  group?: "about" | "contact" | "blog";
  children?: Array<{ id: string; label: string; href: string }>;
};

export default function SiteHeader({ lang }: { lang?: Locale } = {}) {
  const [me, setMe] = useState<Me>(null);
  const [cart, setCart] = useState<Cart>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const [cmsNavPages, setCmsNavPages] = useState<CmsNavChild[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<"about" | "contact" | "blog" | null>(null);
  const catOpenT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catCloseT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navOpenT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navCloseT = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Sticky shadow and compact chrome on scroll.
  useEffect(() => {
    if (isDashboardRoute) {
      return;
    }

    const onScroll = () => setScrolled(window.scrollY > 32);
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

  async function loadCmsNavPages() {
    try {
      const res = await fetch("/api/cms-pages", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const raw = Array.isArray(data?.pages)
        ? data.pages
        : Array.isArray(data?.data?.pages)
          ? data.data.pages
          : [];
      setCmsNavPages(
        (raw as CmsNavChild[]).filter(
          (p) =>
            p &&
            typeof p === "object" &&
            typeof p.id === "string" &&
            typeof p.slug === "string" &&
            typeof p.title === "string" &&
            (p.group === "about" || p.group === "contact" || p.group === "blog"),
        ),
      );
    } catch {
      setCmsNavPages([]);
    }
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
        void loadCmsNavPages();
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

  const navLinks: NavLink[] = [
    { label: "Home", href: lp },
    { label: "Shop All", href: `${lp}/shop` },
    { label: "Gift Categories", href: `${lp}/categories` },
    {
      label: "About Us",
      href: `${lp}/about`,
      group: "about",
      children: cmsNavPages
        .filter((p) => p.group === "about")
        .map((p) => ({ id: p.id, label: p.title, href: publicCmsPath(detectedLang, p.slug) })),
    },
    {
      label: "Contact Us",
      href: `${lp}/contact`,
      group: "contact",
      children: cmsNavPages
        .filter((p) => p.group === "contact")
        .map((p) => ({ id: p.id, label: p.title, href: publicCmsPath(detectedLang, p.slug) })),
    },
    {
      label: "Blogs",
      href: `${lp}/blog`,
      group: "blog",
      children: cmsNavPages
        .filter((p) => p.group === "blog")
        .map((p) => ({ id: p.id, label: p.title, href: publicCmsPath(detectedLang, p.slug) })),
    },
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

  function clearNavTimers() {
    if (navOpenT.current) {
      clearTimeout(navOpenT.current);
      navOpenT.current = null;
    }
    if (navCloseT.current) {
      clearTimeout(navCloseT.current);
      navCloseT.current = null;
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

  function scheduleNavOpen(group: "about" | "contact" | "blog") {
    clearNavTimers();
    navOpenT.current = setTimeout(() => setOpenNavGroup(group), 120);
  }

  function scheduleNavClose() {
    clearNavTimers();
    navCloseT.current = setTimeout(() => setOpenNavGroup(null), 280);
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
    <style>{`
      main.site-content {
        --site-header-offset: 92px;
      }
      @media (max-width: 767px) {
        main.site-content {
          --site-header-offset: 128px;
        }
      }
      @keyframes boho-nav-pop {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `}</style>
    <header
      className={`fixed inset-x-0 top-0 z-999 w-full border-b border-primary/10 bg-[rgba(238,224,204,0.88)] backdrop-blur-2xl supports-backdrop-filter:bg-[rgba(238,224,204,0.76)] transition-[box-shadow,background-color,border-color] duration-500 ease-out ${
        !isDashboardRoute && scrolled
          ? "shadow-[0_16px_44px_rgba(69,40,24,0.14)] ring-1 ring-white/25"
          : "shadow-[0_8px_26px_rgba(69,40,24,0.08)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/60 to-transparent" />
      {/* Main row: logo, category, search and actions */}
      <div
        className={`mx-auto flex max-w-6xl flex-wrap items-center gap-2.5 px-3 transition-all duration-500 ease-out sm:gap-3 sm:px-4 lg:flex-nowrap ${
          !isDashboardRoute && scrolled ? "py-1.5" : "py-2"
        }`}
      >
        <Link
          href={lp}
          className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-full px-1.5 pr-3 transition-all duration-300 hover:-translate-y-px hover:bg-white/22 hover:shadow-[0_10px_26px_rgba(69,40,24,0.10)]"
          aria-label="Bohosaaz home"
        >
          <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#f8ead8] shadow-[0_8px_22px_rgba(69,40,24,0.12)] ring-1 ring-white/55 transition-all duration-500 ${
            !isDashboardRoute && scrolled ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12"
          }`}>
            <Image
              src="/logo copy.jpeg"
              alt="Bohosaaz"
              width={64}
              height={64}
              className={`rounded-full object-contain transition-all duration-500 ${
                !isDashboardRoute && scrolled ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11"
              }`}
              priority
            />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block font-heading text-[15px] font-semibold tracking-tight text-foreground transition group-hover:text-primary">Bohosaaz</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Meaningful gifting</span>
          </span>
        </Link>

        {/* Category Dropdown */}
        <div
          className="relative hidden shrink-0 lg:block"
          onMouseEnter={scheduleCatOpen}
          onMouseLeave={scheduleCatClose}
        >
          <button
            type="button"
            className={`rounded-full bg-[#823817] px-4 text-primary-foreground shadow-[0_10px_22px_rgba(130,56,23,0.18)] transition-all duration-300 hover:-translate-y-px hover:bg-[#743114] hover:shadow-[0_14px_28px_rgba(130,56,23,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              !isDashboardRoute && scrolled ? "h-9" : "h-10"
            }`}
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
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase">Shop by Category</span>
            </span>
          </button>

          {catOpen ? (
            <div
              className="absolute left-0 top-full z-100 mt-2 max-h-[min(70vh,30rem)] w-[min(31rem,calc(100vw-2rem))] origin-top-left overflow-y-auto rounded-[26px] bg-card/96 p-3.5 shadow-[0_22px_70px_rgba(47,38,34,0.16)] ring-1 ring-white/35 backdrop-blur-2xl animate-[boho-nav-pop_220ms_cubic-bezier(0.16,1,0.3,1)]"
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
          className="order-3 flex w-full min-w-0 flex-1 items-center gap-1 rounded-full bg-[#f8ead8]/82 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_22px_rgba(69,40,24,0.07)] ring-1 ring-primary/8 transition-all duration-300 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_12px_28px_rgba(69,40,24,0.10)] focus-within:ring-primary/22 sm:w-auto md:min-w-56 lg:order-0"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") || "").trim();
            window.location.href = q ? `${lp}/shop?q=${encodeURIComponent(q)}` : `${lp}/shop`;
          }}
        >
          <Input
            name="q"
            placeholder="Search gifts, brands, occasions..."
            className={`border-transparent bg-transparent pl-4 shadow-none transition-all duration-300 focus:scale-100 focus:border-transparent focus:shadow-none ${
              !isDashboardRoute && scrolled ? "h-8" : "h-10 sm:h-9"
            }`}
          />
          <Button
            type="submit"
            variant="primary"
            className={`rounded-full px-4 shadow-[0_8px_18px_rgba(130,56,23,0.18)] transition-all duration-300 ${!isDashboardRoute && scrolled ? "h-8" : "h-10 sm:h-9"}`}
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
            className={`relative grid place-items-center rounded-full border border-primary/10 bg-[#f8ead8]/76 shadow-[0_6px_16px_rgba(69,40,24,0.07)] backdrop-blur transition-all duration-300 hover:-translate-y-px hover:border-primary/22 hover:bg-white/32 hover:shadow-[0_10px_22px_rgba(69,40,24,0.10)] ${
              !isDashboardRoute && scrolled ? "h-9 w-9" : "h-10 w-10"
            }`}
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
              <DropdownTrigger className={`grid place-items-center rounded-full border border-primary/10 bg-[#f8ead8]/76 shadow-[0_6px_16px_rgba(69,40,24,0.07)] backdrop-blur transition-all duration-300 hover:-translate-y-px hover:border-primary/22 hover:bg-white/32 hover:shadow-[0_10px_22px_rgba(69,40,24,0.10)] ${!isDashboardRoute && scrolled ? "h-9 w-9" : "h-10 w-10"}`} aria-label="Profile">
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
                <Button variant="outline" className="h-10 rounded-full bg-[#f8ead8]/76 px-5 text-sm font-semibold shadow-[0_6px_16px_rgba(69,40,24,0.07)]">
                  Login
                </Button>
              </Link>
              <Link href={`${lp}/register`} className="h-10">
                <Button variant="primary" className="h-10 rounded-full px-5 text-sm font-semibold shadow-[0_10px_22px_rgba(130,56,23,0.18)]">
                  Create Account
                </Button>
              </Link>
            </div>
          )}

          {/* Cart */}
          <Link
            href={`${lp}/cart`}
            className={`relative inline-flex items-center gap-2 rounded-full bg-[#823817] px-4 text-primary-foreground shadow-[0_10px_22px_rgba(130,56,23,0.18)] transition-all duration-300 hover:-translate-y-px hover:bg-[#743114] hover:shadow-[0_14px_28px_rgba(130,56,23,0.24)] ${
              !isDashboardRoute && scrolled ? "h-9" : "h-10"
            }`}
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
            className={`relative touch-target inline-flex items-center gap-2 rounded-full bg-[#823817] px-3 text-primary-foreground shadow-[0_10px_22px_rgba(130,56,23,0.18)] transition-all duration-300 ${
              !isDashboardRoute && scrolled ? "h-10" : "h-11"
            }`}
          >
            {Icon.Cart}
            <span className="text-xs font-semibold font-numeric tabular-nums">{cartCount}</span>
          </Link>
          <Button
            variant="outline"
            className={`rounded-full bg-[#f8ead8]/76 px-3 shadow-[0_6px_16px_rgba(69,40,24,0.07)] transition-all duration-300 ${!isDashboardRoute && scrolled ? "h-10" : "h-11"}`}
            onClick={() => setDrawerOpen((open) => !open)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
          >
            {Icon.Menu}
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>

      {/* Compact link row — overflow-visible so CMS dropdowns are not clipped */}
      <div className="relative z-50 hidden border-t border-white/24 bg-[rgba(246,232,212,0.48)] backdrop-blur-2xl sm:block">
        <div className={`mx-auto max-w-6xl overflow-visible px-3 transition-all duration-500 sm:px-4 ${!isDashboardRoute && scrolled ? "py-1" : "py-1.5"}`}>
          <div className="flex flex-wrap items-center justify-start gap-1.5 overflow-visible">
            {navLinks.map((l) => {
              const active =
                l.href === lp
                  ? pathname === lp || pathname === `${lp}/`
                  : pathname === l.href || pathname.startsWith(`${l.href}/`);
              const children = l.children || [];
              const hasDropdown = Boolean(l.group && children.length);
              const linkClass = `relative shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all duration-300 hover:-translate-y-px hover:border-primary/20 hover:bg-white/28 hover:text-primary hover:shadow-[0_8px_18px_rgba(69,40,24,0.08)] ${
                active
                  ? "border-primary/18 bg-white/30 text-primary shadow-[0_8px_18px_rgba(69,40,24,0.08)] after:absolute after:-bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-primary"
                  : "border-transparent bg-transparent text-foreground/82"
              }`;

              // No nested CMS pages → normal link (no icon / no dropdown)
              if (!hasDropdown || !l.group) {
                return (
                  <Link key={l.label} href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                );
              }

              const open = openNavGroup === l.group;
              return (
                <div
                  key={l.label}
                  className="relative shrink-0"
                  onMouseEnter={() => scheduleNavOpen(l.group!)}
                  onMouseLeave={scheduleNavClose}
                >
                  <Link
                    href={l.href}
                    className={`${linkClass} inline-flex items-center gap-1`}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={(e) => {
                      // Keep parent page clickable; open menu on caret/hover only.
                      if (open) return;
                      e.preventDefault();
                      clearNavTimers();
                      setOpenNavGroup(l.group!);
                    }}
                    onFocus={() => {
                      clearNavTimers();
                      setOpenNavGroup(l.group!);
                    }}
                  >
                    {l.label}
                    <span className="text-[9px] leading-none opacity-70" aria-hidden>
                      ▾
                    </span>
                  </Link>
                  {open ? (
                    <div
                      className="absolute left-0 top-full z-[1100] pt-2"
                      onMouseEnter={() => {
                        clearNavTimers();
                        setOpenNavGroup(l.group!);
                      }}
                      onMouseLeave={scheduleNavClose}
                    >
                      <div
                        className="min-w-[14rem] origin-top-left rounded-2xl border border-border/70 bg-card p-2 shadow-[0_18px_50px_rgba(47,38,34,0.18)] ring-1 ring-white/40"
                        role="menu"
                      >
                        <Link
                          href={l.href}
                          role="menuitem"
                          className="block rounded-xl px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-primary/8 hover:text-primary"
                          onClick={() => setOpenNavGroup(null)}
                        >
                          {l.label}
                        </Link>
                        <div className="my-1 h-px bg-border/70" />
                        {children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.href}
                            role="menuitem"
                            className="block rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground transition hover:bg-primary/8 hover:text-primary"
                            onClick={() => setOpenNavGroup(null)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
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
              const children = l.children || [];

              if (!children.length) {
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
              }

              return (
                <details
                  key={l.label}
                  className="rounded-2xl border border-border bg-card/70 overflow-hidden"
                >
                  <summary
                    className={`cursor-pointer list-none px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] ${
                      active ? "bg-primary/10 text-primary" : "text-foreground"
                    }`}
                  >
                    {l.label}
                  </summary>
                  <div className="grid gap-1 border-t border-border/60 p-2">
                    <Link
                      href={l.href}
                      className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted/40 transition"
                      onClick={() => setDrawerOpen(false)}
                    >
                      {l.label} home
                    </Link>
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition"
                        onClick={() => setDrawerOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </details>
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
