import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

export async function GET() {
  const [numberRow, textRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "whatsapp.number" }, select: { value: true } }),
    prisma.setting.findUnique({ where: { key: "whatsapp.text" }, select: { value: true } }),
  ]);

  const number = readString(numberRow?.value);
  const text = readString(textRow?.value);

  return jsonOk({ number, text });
}
