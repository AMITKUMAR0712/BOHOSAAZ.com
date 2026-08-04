import type { Metadata } from "next";
import ContactClient from "@/app/contact/ContactClient";
import { buildMetadata } from "@/lib/seo/metadata";
import { contactPageJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildMetadata({
  title: "Contact — Gift Support Noida & Delhi NCR",
  description:
    "Contact BohoSaazfor gift products, online gifting support, seller inquiries and curated gifts in Noida, Greater Noida, New Delhi and Delhi NCR.",
  path: "/en/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <ContactClient />
    </>
  );
}
