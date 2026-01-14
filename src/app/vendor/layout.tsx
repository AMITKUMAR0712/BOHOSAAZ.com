import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PanelLayout } from "@/components/panel/PanelLayout";
import VendorTopbarActions from "./_components/VendorTopbarActions";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=/vendor/dashboard`);
  if (user.role !== "VENDOR") redirect("/403");
  if (!user.vendor || user.vendor.status !== "APPROVED") redirect("/account/vendor-apply");

  const userName = user.name || user.email;

  return (
    <PanelLayout
      sidebarTitle="Vendor"
      topbarTitle="Vendor Panel"
      role={"VENDOR"}
      userName={userName}
      topbarActions={<VendorTopbarActions />}
      nav={[
        {
          title: "Vendor",
          items: [
            { href: "/vendor/dashboard", label: "Dashboard", match: "exact" },
            { href: "/vendor/products", label: "My Products" },
            { href: "/vendor/products/new", label: "Add Product", match: "exact" },
            { href: "/vendor/orders", label: "Orders" },
            { href: "/vendor/earnings", label: "Earnings" },
            { href: "/vendor/kyc", label: "KYC" },
          ],
        },
      ]}
    >
      {children}
    </PanelLayout>
  );
}
