import { round2 } from "@/lib/money";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatIsoDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function parseYyyyMmDd(value: string | null): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;

  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  if (Number.isNaN(dt.getTime())) return null;
  // verify round-trip to avoid JS Date quirks
  if (dt.toISOString().slice(0, 10) !== value) return null;
  return dt;
}

export function buildCreatedAtRange(searchParams: URLSearchParams):
  | { gte?: Date; lte?: Date }
  | undefined {
  const from = parseYyyyMmDd(searchParams.get("from"));
  const to = parseYyyyMmDd(searchParams.get("to"));
  if (!from && !to) return undefined;

  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    range.gte = from;
  }
  if (to) {
    // inclusive end of day
    range.lte = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));
  }
  return range;
}

export function formatInrRupees(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const n = round2(Number(value));
  if (!Number.isFinite(n)) return "";
  return `₹${n.toFixed(2)}`;
}

export function formatInrPaise(value: bigint | null | undefined): string {
  if (value === null || value === undefined) return "";
  const paise = BigInt(value);
  const zero = BigInt(0);
  const hundred = BigInt(100);
  const sign = paise < zero ? "-" : "";
  const abs = paise < zero ? -paise : paise;
  const rupees = abs / hundred;
  const rem = abs % hundred;
  const rem2 = rem.toString().padStart(2, "0");
  return `${sign}₹${rupees.toString()}.${rem2}`;
}
