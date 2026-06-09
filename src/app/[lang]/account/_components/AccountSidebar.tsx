"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDollarSign,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  Package,
  RotateCcw,
  Settings,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";

function NavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={
        "group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
        (active
          ? "bg-muted/60 text-foreground font-semibold"
          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40")
      }
    >
      {icon ? (
        <span
          className={
            "shrink-0 " +
            (active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")
          }
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      {label}
    </Link>
  );
}

export default function AccountSidebar({
  lang,
  showVendorApply,
}: {
  lang: string;
  showVendorApply: boolean;
}) {
  const base = `/${lang}/account`;

  return (
    <div className="rounded-[22px] border border-border bg-card/90 p-2 shadow-sm backdrop-blur md:rounded-(--radius) md:p-4">
      <div className="mobile-scroll md:flex md:flex-col md:gap-2 md:overflow-visible">
        <NavItem href={base} label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
        <NavItem href={`${base}/profile`} label="Profile & Address" icon={<User className="h-4 w-4" />} />
        <NavItem href={`${base}/cart`} label="Cart" icon={<ShoppingCart className="h-4 w-4" />} />
        <NavItem href={`${base}/wishlist`} label="Wishlist" icon={<Heart className="h-4 w-4" />} />
        <NavItem href={`${base}/orders`} label="Orders" icon={<Package className="h-4 w-4" />} />
        <NavItem href={`${base}/returns`} label="Return / Refund" icon={<RotateCcw className="h-4 w-4" />} />
        <NavItem href={`${base}/support`} label="Support" icon={<LifeBuoy className="h-4 w-4" />} />
        <NavItem href={`${base}/payments`} label="Payments" icon={<CircleDollarSign className="h-4 w-4" />} />
        <NavItem href={`${base}/security`} label="Settings" icon={<Settings className="h-4 w-4" />} />
        {showVendorApply ? (
          <NavItem href={`${base}/vendor-apply`} label="Become a Vendor" icon={<Store className="h-4 w-4" />} />
        ) : null}
      </div>
    </div>
  );
}
