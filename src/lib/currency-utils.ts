/**
 * Currency conversion and utilities
 * Note: These are fixed rates for demonstration. In production, you should:
 * 1. Fetch from a real exchange rate API (Open Exchange Rates, Fixer, etc.)
 * 2. Cache the rates with appropriate TTL
 * 3. Store conversion history for audit purposes
 */

// Exchange rate: 1 USD = X INR
// Update this periodically or fetch from an API
const EXCHANGE_RATES = {
  "INR/USD": 0.012, // 1 INR = 0.012 USD
  "USD/INR": 83.33, // 1 USD = 83.33 INR (inverse of above)
} as const;

export function convertCurrency(
  amount: number,
  fromCurrency: "INR" | "USD",
  toCurrency: "INR" | "USD"
): number {
  if (fromCurrency === toCurrency) return amount;

  const rate =
    fromCurrency === "USD"
      ? EXCHANGE_RATES["USD/INR"]
      : EXCHANGE_RATES["INR/USD"];

  const converted = amount * rate;
  // Round to 2 decimal places
  return Math.round(converted * 100) / 100;
}

/**
 * Get the display price based on user's selected currency
 * If product is in INR and user selects USD, convert it
 */
export function getPriceInCurrency(
  price: number,
  productCurrency: "INR" | "USD",
  displayCurrency: "INR" | "USD"
): number {
  if (productCurrency === displayCurrency) return price;
  return convertCurrency(price, productCurrency, displayCurrency);
}

/**
 * Format a price with currency conversion handling
 */
import { formatMoney } from "@/lib/money";

export function formatPriceInCurrency(
  price: number,
  productCurrency: "INR" | "USD",
  displayCurrency: "INR" | "USD"
): string {
  const displayPrice = getPriceInCurrency(price, productCurrency, displayCurrency);
  return formatMoney(displayCurrency, displayPrice);
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(
  from: "INR" | "USD",
  to: "INR" | "USD"
): number {
  if (from === to) return 1;
  return from === "USD" ? EXCHANGE_RATES["USD/INR"] : EXCHANGE_RATES["INR/USD"];
}

/**
 * Update exchange rates (would be called periodically in production)
 * For now, returns a function that updates in-memory rates
 */
export function setExchangeRate(from: "INR" | "USD", to: "INR" | "USD", rate: number) {
  const key = `${from}/${to}`;
  if (key === "USD/INR") {
    (EXCHANGE_RATES as any)["USD/INR"] = rate;
    (EXCHANGE_RATES as any)["INR/USD"] = 1 / rate;
  } else if (key === "INR/USD") {
    (EXCHANGE_RATES as any)["INR/USD"] = rate;
    (EXCHANGE_RATES as any)["USD/INR"] = 1 / rate;
  }
}
