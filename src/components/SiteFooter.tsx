"use client";

import { isLocale } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function SiteFooter() {
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean)[0];
  const lang = seg && isLocale(seg) ? seg : "en";
  const lp = `/${lang}`;
  const trackingSteps = [
    { label: "Picked", icon: "🎁" },
    { label: "Packed", icon: "📦" },
    { label: "Secured", icon: "🛡" },
    { label: "Out", icon: "🚚" },
    { label: "Delivered", icon: "🏠" },
  ];
  const [activeStep, setActiveStep] = useState(1);
  const [liveStats, setLiveStats] = useState({
    successRate: 98.4,
    delivered: 12500,
    etaHours: 47,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % trackingSteps.length);
      setLiveStats((stats) => ({
        successRate: Math.min(99.2, Number((stats.successRate + 0.1).toFixed(1))),
        delivered: stats.delivered + 3,
        etaHours: stats.etaHours === 43 ? 47 : stats.etaHours - 1,
      }));
    }, 2200);

    return () => window.clearInterval(timer);
  }, [trackingSteps.length]);

  const formatNumber = (value: number) =>
    value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <footer className="relative mt-5 overflow-hidden bg-linear-to-b from-card/65 to-background pb-[calc(var(--mobileBottomNav)+env(safe-area-inset-bottom,0px)+1.5rem)] md:mt-6 md:pb-0">
      <div className="h-1 w-full bg-linear-to-r from-transparent via-primary/55 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="relative overflow-hidden rounded-[34px] bg-card/55 p-5 ring-1 ring-white/25 md:p-7">
          <div className="relative grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
                Find <span className="text-primary">meaningful gifts</span> for every celebration.
              </div>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-foreground/74 md:text-sm">
                <span className="font-semibold text-primary">Curated picks</span>, artisan craftsmanship, and{" "}
                <span className="font-semibold text-primary">beautiful packaging</span> for moments that deserve more.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href={`${lp}/shop`}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-(--shadowBtn) hover:shadow-(--shadowBtnHover) hover:brightness-95 hover:scale-[1.02] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Start Gifting →
                </Link>
                <Link
                  href={`${lp}/categories`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-background/70 px-5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/35 hover:bg-muted/35"
                >
                  Explore Categories
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-primary/22 bg-linear-to-br from-card/92 via-background/78 to-primary/14 p-4 shadow-[0_18px_52px_rgba(135,56,20,0.16)] ring-1 ring-white/35 backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/14 blur-2xl" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-primary/80">Safe & secure</div>
                  <div className="font-heading text-xl tracking-tight text-foreground drop-shadow-sm">Delivered with care</div>
                </div>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  Protected
                </span>
              </div>

              <div className="footer-safe-scene relative mt-4 overflow-hidden rounded-[24px] border border-primary/14 bg-background/62 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_28px_rgba(135,56,20,0.10)]">
                <div className="flex items-center justify-between gap-2">
                  {trackingSteps.map((step, index) => {
                    const isActive = index === activeStep;
                    const isDone = index < activeStep;

                    return (
                      <div key={step.label} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1">
                        <div
                          className={
                            "grid h-8 w-8 place-items-center rounded-full text-sm shadow-sm transition duration-500 " +
                            (isActive
                              ? "scale-110 bg-primary text-primary-foreground shadow-(--shadowBtn)"
                              : isDone
                                ? "bg-primary/18 text-primary"
                                : "bg-background/70 text-foreground/55")
                          }
                        >
                          {step.icon}
                        </div>
                        <span
                          className={
                            "truncate text-[10px] font-semibold transition " +
                            (isActive || isDone ? "text-primary" : "text-muted-foreground")
                          }
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                  <div className="absolute left-7 right-7 top-7 h-1 rounded-full bg-primary/10" />
                  <div
                    className="absolute left-7 top-7 h-1 rounded-full bg-primary transition-all duration-700"
                    style={{
                      width: `${(activeStep / (trackingSteps.length - 1)) * 100}%`,
                      maxWidth: "calc(100% - 3.5rem)",
                    }}
                  />
                </div>
                <div className="mt-3 grid gap-1.5 text-[11px] font-medium text-foreground/85 sm:grid-cols-3">
                  <span className="rounded-lg border border-primary/10 bg-background/70 px-2 py-1">
                    <span className="font-bold text-primary">{liveStats.successRate}%</span> success rate
                  </span>
                  <span className="rounded-lg border border-primary/10 bg-background/70 px-2 py-1">
                    <span className="font-bold text-primary">{formatNumber(liveStats.delivered)}+</span> delivered
                  </span>
                  <span className="rounded-lg border border-primary/10 bg-background/70 px-2 py-1">
                    <span className="font-bold text-primary">{Math.ceil(liveStats.etaHours / 24)} days</span> delivery
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/55" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Live secured dispatch updates
                </div>
                <Link
                  href={`${lp}/account/orders`}
                  className="mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-primary/15 bg-background/65 px-3 text-[11px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                >
                  Track Package
                </Link>
              </div>
            </div>
          </div>
          {/* ✅ Main Footer Content */}
          <div className="relative mt-7 pt-6">
          <div className="relative grid gap-8 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-4">
            <Link href={lp} className="flex items-center gap-3 group">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-primary/25 bg-card shadow-[0_12px_34px_rgba(135,56,20,0.20),0_0_0_5px_rgba(184,134,50,0.09)] transition duration-300 ease-out group-hover:scale-105 group-hover:border-primary/45 group-hover:shadow-premium">
                <Image
                  src="/logo copy.jpeg"
                  alt="Bohosaaz"
                  width={80}
                  height={80}
                  className="h-10 w-10 rounded-full object-contain"
                />
              </div>
              <div>
                <div className="font-heading text-xl tracking-tight text-foreground drop-shadow-sm group-hover:text-primary transition">
                  Bohosaaz
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-primary/80">
                  Art of meaningful gifting
                </div>
              </div>
            </Link>

            <p className="mt-2 text-xs text-foreground/72 max-w-sm leading-relaxed">
              Bohosaaz brings together <span className="font-semibold text-primary">thoughtful gifts</span>,{" "}
              <span className="font-semibold text-primary">handcrafted keepsakes</span>, and artisan-made pieces
              curated for birthdays, weddings, festivals, and the people who matter most.
            </p>
          </div>

          {/* Right */}
          <div className="lg:col-span-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pages */}
              <FooterCol title="Pages">
                <FooterLink currentPathname={pathname} href={lp} label="Home" />
                <FooterLink currentPathname={pathname} href={`${lp}/shop`} label="Shop Gifts" />
                <FooterLink currentPathname={pathname} href={`${lp}/categories`} label="Categories" />
                <FooterLink currentPathname={pathname} href={`${lp}/brands/popular`} label="Popular Brands" />
                <FooterLink currentPathname={pathname} href={`${lp}/brands/luxury`} label="Luxury Brands" />
                <FooterLink currentPathname={pathname} href={`${lp}/about`} label="About Bohosaaz" />
              </FooterCol>

              {/* Account */}
              <FooterCol title="Account">
                <FooterLink currentPathname={pathname} href={`${lp}/account`} label="My Account" />
                <FooterLink currentPathname={pathname} href={`${lp}/account/orders`} label="Track Orders" />
                <FooterLink currentPathname={pathname} href={`${lp}/account/wishlist`} label="Wishlist" />
                <FooterLink currentPathname={pathname} href={`${lp}/seller`} label="Sell on Bohosaaz" />
                <FooterLink currentPathname={pathname} href={`${lp}/contact`} label="Customer Support" />
                <FooterLink currentPathname={pathname} href={`${lp}/faq`} label="Help & FAQ" />
              </FooterCol>

              {/* Social */}
              <FooterCol title="Social">
                <a
                  className="text-muted-foreground hover:text-foreground transition flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Instagram
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground transition flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Facebook
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground transition flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  YouTube
                </a>
              </FooterCol>

              {/* FAQ */}
              <FooterCol title="FAQ">
                <Link
                  href={`${lp}/faq`}
                  className="group block rounded-2xl border border-primary/15 bg-linear-to-br from-primary/8 via-card/75 to-background/70 p-2.5 transition hover:-translate-y-1 hover:border-primary/30 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="font-heading text-sm text-foreground">
                    Need help <span className="text-primary">choosing</span> or tracking a gift?
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Open our FAQ for shipping, returns, gifting and order support.
                  </p>
                  <div className="mt-2 text-xs font-semibold text-primary">View FAQ →</div>
                </Link>
              </FooterCol>
            </div>
          </div>
          </div>

        {/* ✅ Bottom bar */}
        <div className="relative mt-4 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground md:flex-row md:text-left">
          <div className="leading-relaxed">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-foreground">Bohosaaz</span>. All
            rights reserved.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href={`${lp}/terms`} className="hover:text-foreground transition underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Terms
            </Link>
            <Link href={`${lp}/privacy`} className="hover:text-foreground transition underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Privacy
            </Link>
            <Link href={`${lp}/return`} className="hover:text-foreground transition underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Returns
            </Link>
            <Link href={`${lp}/faq`} className="hover:text-foreground transition underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              FAQ
            </Link>
          </div>
        </div>
      </div>
      </div>
      </div>
    </footer>
  );
}

/* ✅ Small Components */
function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-primary/80">
        {title}
      </div>
      <div className="mt-2.5 grid gap-1.5 text-xs">{children}</div>
    </div>
  );
}

function FooterLink({
  currentPathname,
  href,
  label,
}: {
  currentPathname: string;
  href: string;
  label: string;
}) {
  const isActive = currentPathname === href || (href !== "/" && currentPathname.startsWith(href + "/"));
  return (
    <Link
      className={
        (isActive
          ? "text-primary font-semibold"
          : "text-foreground/72 hover:text-primary") +
        " transition flex items-center gap-1.5 w-full rounded-lg px-1.5 py-0.5 underline-offset-4 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
      href={href}
    >
      <span className={(isActive ? "scale-125 opacity-100" : "opacity-70") + " h-1.5 w-1.5 rounded-full bg-primary transition"} />
      {label}
    </Link>
  );
}
