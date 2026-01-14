"use client";

import { isLocale } from "@/lib/i18n";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { AdSlot } from "@/components/ads/AdSlot";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean)[0];
  const lang = seg && isLocale(seg) ? seg : "en";
  const lp = `/${lang}`;

  const features = [
    { title: "Worldwide", text: "Free shipping in India", icon: "✦" },
    { title: "Craft First", text: "Handmade • Small batches", icon: "✶" },
    { title: "Since 2009", text: "Trusted by thousands", icon: "✷" },
  ];

  return (
    <footer className="mt-14 border-t border-border bg-background relative overflow-hidden">
      {/* ✅ Premium background layers */}
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-muted/20 via-background to-background" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-[pulse_7s_ease-in-out_infinite] motion-reduce:animate-none" />
      <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-muted/50 blur-3xl animate-[pulse_9s_ease-in-out_infinite] motion-reduce:animate-none" />
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[22px_22px]" />

      <AdSlot placement="FOOTER_STRIP" className="mx-auto max-w-6xl px-4 py-6" />

      {/* ✅ CTA STRIP */}
      <div className="border-b border-border bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Exclusive Drops
            </div>
            <div className="font-heading text-xl md:text-2xl tracking-tight text-foreground">
              Get premium handcrafted deals every week ✨
            </div>
          </div>

          <Link
            href={`${lp}?sort=offer`}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-(--shadowBtn) hover:shadow-(--shadowBtnHover) hover:brightness-95 hover:scale-[1.02] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Shop Offers →
          </Link>
        </div>
      </div>

      {/* ✅ Feature strip */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-(--shadowCardSoft) hover:shadow-premium hover:-translate-y-1 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full border border-border bg-background/70 grid place-items-center text-primary shadow-sm group-hover:scale-110 transition">
                    <span className="text-lg" aria-hidden>
                      {f.icon}
                    </span>
                  </div>
                  <div>
                    <div className="font-heading text-lg text-foreground">
                      {f.title}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {f.text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Main Footer Content */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-4">
            <Link href={lp} className="flex items-center gap-3 group">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border border-border bg-card grid place-items-center shadow-sm group-hover:shadow-md transition">
                <Image
                  src="/mainlogo.jpeg"
                  alt="Bohosaaz"
                  width={64}
                  height={64}
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                />
              </div>
              <div>
                <div className="font-heading text-2xl tracking-tight group-hover:text-primary transition">
                  Bohosaaz
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Handmade marketplace
                </div>
              </div>
            </Link>

            <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
              A multi-vendor marketplace for authentic handcrafted goods — curated
              for premium taste, crafted to last.
            </p>
          </div>

          {/* Right */}
          <div className="lg:col-span-8">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pages */}
              <FooterCol title="Pages">
                <FooterLink currentPathname={pathname} href={lp} label="Home" />
                <FooterLink currentPathname={pathname} href={`${lp}/about`} label="About" />
                <FooterLink currentPathname={pathname} href={`${lp}/contact`} label="Contact" />
                <FooterLink currentPathname={pathname} href={`${lp}/latest`} label="Latest" />
                <FooterLink currentPathname={pathname} href={`${lp}/offers`} label="Offers" />
                <FooterLink currentPathname={pathname} href={`${lp}/blogs`} label="Blog" />
              </FooterCol>

              {/* Account */}
              <FooterCol title="Account">
                <FooterLink currentPathname={pathname} href={`${lp}/account`} label="My account" />
                <FooterLink currentPathname={pathname} href={`${lp}/account/orders`} label="Orders" />
                <FooterLink currentPathname={pathname} href={`${lp}/seller`} label="Seller" />
                <FooterLink currentPathname={pathname} href={`${lp}/terms`} label="Terms" />
                <FooterLink currentPathname={pathname} href={`${lp}/privacy`} label="Privacy" />
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
              <div>
                <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                  FAQ
                </div>
                <div className="mt-4 rounded-3xl border border-border bg-card/80 backdrop-blur-xl shadow-sm overflow-hidden">
                  <Accordion>
                    <AccordionItem title="Do you ship internationally?">
                      Yes — availability varies by destination. Free shipping is available in India.
                    </AccordionItem>
                    <AccordionItem title="What is your return policy?">
                      Returns are accepted on eligible items as per our policy. Contact support for help.
                    </AccordionItem>
                    <AccordionItem title="How do I track my order?">
                      You can view order status in your account under Orders.
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Bottom bar */}
        <div className="mt-12 border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-foreground">Bohosaaz</span>. All
            rights reserved.
          </div>

          <div className="flex items-center gap-4">
            <Link href={`${lp}/terms`} className="hover:text-foreground transition underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Terms
            </Link>
            <Link href={`${lp}/privacy`} className="hover:text-foreground transition underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Privacy
            </Link>
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
      <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
        {title}
      </div>
      <div className="mt-4 grid gap-2 text-sm">{children}</div>
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
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground") +
        " transition flex items-center gap-2 w-full underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
      href={href}
    >
      <span className={(isActive ? "opacity-100" : "opacity-80") + " h-2 w-2 rounded-full bg-primary"} />
      {label}
    </Link>
  );
}
