import AccountProfileClient from "@/components/account/AccountProfileClient";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Profile & Address",
  description: "Manage your BohoSaazprofile and shipping addresses.",
  path: "/en/account/profile",
  noindex: true,
  nofollow: true,
});

export default function AccountProfilePage() {
  return <AccountProfileClient loginHref="/login?next=/account/profile" />;
}
