import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PanelLayout } from "@/components/panel/PanelLayout";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=/account`);

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
            { href: "/account/orders", label: "My Orders" },
            { href: "/account/returns", label: "Returns/Refunds" },
            { href: "/account/wallet", label: "Wallet" },
            { href: "/account/support", label: "Support" },
            { href: "/account/profile", label: "Profile" },
          ],
        },
      ]}
    >
      {children}
    </PanelLayout>
  );
}
