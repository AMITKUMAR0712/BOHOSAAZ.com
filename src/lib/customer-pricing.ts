import { getPriceInCurrency } from "@/lib/currency-utils";
import { round2 } from "@/lib/money";

export type SupportedCurrency = "INR" | "USD";

export function getVendorDisplayMarkup(displayCurrency: SupportedCurrency): number {
  return displayCurrency === "USD" ? 1.8 : 1.1;
}

export function getCustomerUnitPrice({
  basePrice,
  productCurrency,
  displayCurrency,
  isVendorProduct,
}: {
  basePrice: number;
  productCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  isVendorProduct: boolean;
}): number {
  const converted = getPriceInCurrency(Number(basePrice || 0), productCurrency, displayCurrency);
  return round2(isVendorProduct ? converted * getVendorDisplayMarkup(displayCurrency) : converted);
}

export function getCurrencyFromCookie(cookieValue: string | undefined | null): SupportedCurrency {
  return cookieValue === "USD" ? "USD" : "INR";
}
