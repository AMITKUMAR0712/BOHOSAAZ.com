"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DrawerMe =
  | {
      user?: {
        role: "USER" | "VENDOR" | "ADMIN";
        email: string;
        vendor?: { status?: string | null } | null;
      };
    }
  | null;

export function MobileDrawer({
  open,
  onClose,
  langPrefix,
  sellerHref,
  cartSummary,
  me,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  langPrefix: string;
  sellerHref: string;
  cartSummary: string;
  me: DrawerMe;
  onLogout: () => Promise<void>;
}) {
  if (!open) return null;

  const role = me?.user?.role;
  const vendorStatus = me?.user?.vendor?.status || null;

  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-[86%] max-w-sm bg-background border-r border-border p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Menu</div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4">
          <div className="text-xs text-muted-foreground">Search</div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") || "").trim();
              window.location.href = q ? `${langPrefix}?q=${encodeURIComponent(q)}` : langPrefix;
            }}
          >
            <Input name="q" placeholder="Search here..." />
            <Button type="submit">Go</Button>
          </form>
        </div>

        <div className="mt-4 rounded-(--radius) border border-border bg-muted/30 p-3 text-sm">
          <div className="text-xs text-muted-foreground">Cart</div>
          <div className="font-semibold">{cartSummary}</div>
          <Link href={`${langPrefix}/cart`} className="mt-2 inline-block text-sm text-primary underline">
            View cart
          </Link>
        </div>

        <div className="mt-4 rounded-(--radius) border border-border bg-card p-3">
          {me?.user ? (
            <>
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="text-sm font-semibold truncate">{me.user.email}</div>
              <div className="mt-3 grid gap-1">
                <Link
                  className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition"
                  href={`${langPrefix}/account`}
                >
                  My Account
                </Link>
                <Link
                  className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition"
                  href={`${langPrefix}/account/orders`}
                >
                  Orders
                </Link>
                <Link
                  className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition"
                  href={`${langPrefix}/account/returns`}
                >
                  Returns/Refunds
                </Link>
                {role === "VENDOR" && vendorStatus === "APPROVED" ? (
                  <Link
                    className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition"
                    href={`${langPrefix}/vendor`}
                  >
                    Vendor Panel
                  </Link>
                ) : null}
                {role === "ADMIN" ? (
                  <Link
                    className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition"
                    href={`${langPrefix}/admin`}
                  >
                    Admin Panel
                  </Link>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await onLogout();
                    onClose();
                  }}
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Link href={`${langPrefix}/login`}>
                <Button variant="outline" className="w-full">
                  Login
                </Button>
              </Link>
              <Link href={`${langPrefix}/register`}>
                <Button className="w-full">Create account</Button>
              </Link>
            </div>
          )}
        </div>

        <nav className="mt-5 grid gap-1">
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={langPrefix}>
            Home
          </Link>
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={`${langPrefix}/about`}>
            About Us
          </Link>
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={`${langPrefix}/contact`}>
            Contact Us
          </Link>
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={sellerHref}>
            Seller
          </Link>
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={`${langPrefix}?q=discover%20craft`}>
            Discover Craft
          </Link>
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={`${langPrefix}?q=research%20archive`}>
            Research & Archive
          </Link>
          <Link className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition" href={`${langPrefix}?q=blog`}>
            Blogs & Stories
          </Link>
        </nav>

        <div className="mt-6">
          <div className="text-xs text-muted-foreground">Shop by Category</div>
          <div className="mt-2 grid gap-1">
            {[
              { label: "Saree", q: "saree" },
              { label: "Shawl / Stole", q: "shawl" },
              { label: "Wall Art", q: "wall art" },
              { label: "Indian Handicrafts", q: "handicrafts" },
              { label: "Latest Products", q: "", sort: "latest" },
              { label: "Special Offer", q: "", sort: "offer" },
            ].map((c) => (
              <Link
                key={c.label}
                className="rounded-(--radius) px-3 py-2 text-sm hover:bg-muted/60 transition"
                href={
                  c.sort
                    ? `${langPrefix}?sort=${encodeURIComponent(c.sort)}`
                    : `${langPrefix}?q=${encodeURIComponent(c.q)}`
                }
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
