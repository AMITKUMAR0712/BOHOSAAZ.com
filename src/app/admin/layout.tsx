import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PanelLayout } from "@/components/panel/PanelLayout";
import AdminTopbarActions from "./_components/AdminTopbarActions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  if (!user) redirect(`/login?next=/admin`);

  const userName = user.name || user.email;

  return (
    <PanelLayout
      sidebarTitle="Admin"
      topbarTitle="Admin Panel"
      role={"ADMIN"}
      userName={userName}
      topbarActions={<AdminTopbarActions />}
      nav={[
        {
          title: "Admin",
          items: [
            { href: "/admin", label: "Dashboard", match: "exact" },
          ],
        },
        {
          title: "Catalog",
          items: [
            { href: "/admin/products", label: "All Products" },
            { href: "/admin/products/new", label: "Add Product", match: "exact" },
            { href: "/admin/categories", label: "Categories" },
          ],
        },
        {
          title: "Orders & Customers",
          items: [
            { href: "/admin/orders", label: "Orders" },
            { href: "/admin/customers", label: "Customers" },
          ],
        },
        {
          title: "Vendors",
          items: [{ href: "/admin/vendors", label: "Vendors" }],
        },
        {
          title: "Marketing",
          items: [
            { href: "/admin/ads", label: "Ads" },
            { href: "/admin/coupons", label: "Coupons" },
            { href: "/admin/blog", label: "Blog Content" },
          ],
        },
        {
          title: "Commission System",
          items: [
            { href: "/admin/commission/plans", label: "Commission Plans" },
            { href: "/admin/commission/history", label: "Commission History" },
          ],
        },
        {
          title: "Settings",
          items: [
            { href: "/admin/settings", label: "Settings" },
            { href: "/admin/settings/site", label: "Site Settings", match: "exact" },
          ],
        },
      ]}
    >
      {children}
    </PanelLayout>
  );
}
