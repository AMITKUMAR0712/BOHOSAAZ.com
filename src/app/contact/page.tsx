import type { Metadata } from "next";
import ContactClient from "@/app/contact/ContactClient";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact — Gift Support Noida & Delhi NCR",
  description:
    "Contact Bohosaaz for gift products, online gifting support, seller inquiries and curated gifts in Noida, Greater Noida, New Delhi and Delhi NCR.",
  path: "/en/contact",
});

export default function ContactPage() {
  return <ContactClient />;
}
