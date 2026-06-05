import type { Metadata } from "next";
import ContactClient from "@/app/contact/ContactClient";

export const metadata: Metadata = {
  title: "Contact Bohosaaz | Gift Products in Noida & Delhi NCR",
  description:
    "Contact Bohosaaz for gift products, online gifting support, seller inquiries and curated gifts in Noida, Greater Noida, New Delhi and Delhi NCR.",
  keywords: ["contact Bohosaaz", "gift support Noida", "online gifts Delhi NCR", "seller inquiry gifting marketplace"],
};

export default function ContactPage() {
  return <ContactClient />;
}
