import type { Metadata } from "next";
import ReturnsRefundsPage from "@/app/return/page";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Returns & Refunds",
  description:
    "Read Bohosaaz return, exchange, credit note and refund policy details for gift orders across Noida and Delhi NCR.",
  path: "/en/return",
});

export default function LocalizedReturnsRefundsPage() {
  return <ReturnsRefundsPage />;
}
