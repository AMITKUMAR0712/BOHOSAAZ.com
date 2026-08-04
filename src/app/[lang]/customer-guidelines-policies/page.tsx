import type { Metadata } from "next";
import CustomerGuidelinesPoliciesPage from "@/app/customer-guidelines-policies/page";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Customer Guidelines & Policies",
  description:
    "Read BohoSaazcustomer guidelines covering orders, payments, shipping, cancellations, refunds, replacements, and support.",
  path: "/en/customer-guidelines-policies",
});

export default function LocalizedCustomerGuidelinesPoliciesPage() {
  return <CustomerGuidelinesPoliciesPage />;
}
