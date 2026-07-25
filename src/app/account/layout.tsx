import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PanelLayout } from "@/components/panel/PanelLayout";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=/account`);

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });

  const showBecomeVendor = !vendor || vendor.status !== "APPROVED";
  const vendorNavLabel =
    vendor?.status === "PENDING"
      ? "Vendor status"
      : vendor?.status === "REJECTED"
        ? "Resubmit vendor KYC"
        : vendor?.status === "APPROVED"
          ? "Vendor dashboard"
          : "Become a Vendor";

  const vendorHref =
    vendor?.status === "APPROVED"
      ? "/account/activate-vendor?next=/vendor/dashboard"
      : vendor?.status === "PENDING"
        ? "/account/vendor-status"
        : "/account/vendor-apply";

  const userName = user.name || user.email;

  return (
    <PanelLayout
      sidebarTitle="Account"
      topbarTitle="My Account"
      role={"USER"}
      userName={userName}
      nav={[
        {
          title: "User",
          items: [
            { href: "/account", label: "Dashboard", match: "exact" },
            { href: "/account/cart", label: "Add to cart" },
            { href: "/account/orders", label: "My Orders" },
            { href: "/account/returns", label: "Return / Refund" },
            { href: "/account/wishlist", label: "Wishlist" },
            { href: "/account/support", label: "Support" },
            { href: "/account/profile", label: "Profile & Address" },
            ...(showBecomeVendor
              ? [{ href: vendorHref, label: vendorNavLabel }]
              : [
                  {
                    href: "/account/activate-vendor?next=/vendor/dashboard",
                    label: "Vendor dashboard",
                  },
                ]),
          ],
        },
      ]}
    >
      {children}
    </PanelLayout>
  );
}
