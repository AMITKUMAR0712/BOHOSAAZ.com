import type { Metadata } from "next";
import ContactClient from "@/app/contact/ContactClient";

export const metadata: Metadata = {
  title: "Contact | Bohosaaz",
  description: "Contact Bohosaaz support or reach out for seller inquiries.",
};

export default function ContactPage() {
  return <ContactClient />;
}
