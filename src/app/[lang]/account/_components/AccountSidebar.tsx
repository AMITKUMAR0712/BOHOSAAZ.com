"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDollarSign,
  LayoutDashboard,
  LifeBuoy,
  Package,
  RotateCcw,
  Shield,
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
        "group inline-flex items-center gap-2 rounded-(--radius) border border-border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
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
    <div className="rounded-(--radius) border border-border bg-card p-3 md:p-4">
      <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        <NavItem href={base} label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
        <NavItem href={`${base}/profile`} label="Profile & Address" icon={<User className="h-4 w-4" />} />
        <NavItem href={`${base}/cart`} label="Cart" icon={<ShoppingCart className="h-4 w-4" />} />
        <NavItem href={`${base}/orders`} label="Orders" icon={<Package className="h-4 w-4" />} />
        <NavItem href={`${base}/returns`} label="Returns & Refunds" icon={<RotateCcw className="h-4 w-4" />} />
        <NavItem href={`${base}/support`} label="Support" icon={<LifeBuoy className="h-4 w-4" />} />
        <NavItem href={`${base}/payments`} label="Payments" icon={<CircleDollarSign className="h-4 w-4" />} />
        <NavItem href={`${base}/security`} label="Security" icon={<Shield className="h-4 w-4" />} />
        {showVendorApply ? (
          <NavItem href={`${base}/vendor-apply`} label="Become a Vendor" icon={<Store className="h-4 w-4" />} />
        ) : null}
      </div>
    </div>
  );
}
