export function rupeesToPaise(rupees: number): bigint {
  if (!Number.isFinite(rupees)) throw new Error("Invalid rupees amount");
  return BigInt(Math.round(rupees * 100));
}

export function amountToMinorUnits(currency: "INR" | "USD", amount: number): bigint {
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  // INR -> paise, USD -> cents
  // Razorpay expects the smallest currency unit for the chosen currency.
  return BigInt(Math.round(amount * 100));
}

export function paiseToRupees(paise: bigint): number {
  return Number(paise) / 100;
}

export function round2(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatInr(value: number) {
  const n = round2(Number(value));
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatUsd(value: number) {
  const n = round2(Number(value));
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(currency: "INR" | "USD", value: number) {
  return currency === "USD" ? formatUsd(value) : formatInr(value);
}
