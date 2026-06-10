import type { Metadata } from "next";
import ReturnsRefundsPage from "@/app/return/page";

export const metadata: Metadata = {
  title: "Returns & Refunds | Bohosaaz",
  description:
    "Read Bohosaaz return, exchange, credit note and refund policy details for gift orders.",
};

export default function LocalizedReturnsRefundsPage() {
  return <ReturnsRefundsPage />;
}
