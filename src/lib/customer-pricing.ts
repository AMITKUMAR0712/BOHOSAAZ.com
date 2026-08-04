import { getPriceInCurrency } from "@/lib/currency-utils";
import { round2 } from "@/lib/money";

export type SupportedCurrency = "INR" | "USD";

export function getCustomerUnitPrice({
  basePrice,
  productCurrency,
  displayCurrency,
}: {
  basePrice: number;
  productCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  isVendorProduct?: boolean;
}): number {
  const converted = getPriceInCurrency(Number(basePrice || 0), productCurrency, displayCurrency);
  return round2(converted);
}

export function getCurrencyFromCookie(cookieValue: string | undefined | null): SupportedCurrency {
  return cookieValue === "USD" ? "USD" : "INR";
}
