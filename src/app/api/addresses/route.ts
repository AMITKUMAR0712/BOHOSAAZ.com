import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  id: z.string().trim().min(1).optional(),
  label: z.string().trim().max(80).optional().nullable(),
  fullName: z.string().trim().min(2).max(191),
  phone: z.string().trim().min(8).max(30),
  address1: z.string().trim().min(5).max(191),
  address2: z.string().trim().max(191).optional().nullable(),
  city: z.string().trim().min(2).max(191),
  state: z.string().trim().min(2).max(191),
  pincode: z.string().trim().min(4).max(20),
  kind: z.enum(["PRIMARY", "DEFAULT", "SECONDARY"]).optional().default("SECONDARY"),
  isDefault: z.boolean().optional().default(false),
});

const patchSchema = z.object({
  id: z.string().trim().min(1),
  action: z.enum(["update", "delete", "default"]).optional().default("update"),
  address: addressSchema.omit({ id: true }).partial().optional(),
});

function normalizeKind(kind: string, isDefault: boolean) {
  if (isDefault) return "DEFAULT";
  return kind === "PRIMARY" || kind === "DEFAULT" || kind === "SECONDARY" ? kind : "SECONDARY";
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.userAddress.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = addressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const count = await prisma.userAddress.count({ where: { userId: user.id } });
  const shouldDefault = parsed.data.isDefault || count === 0 || parsed.data.kind === "DEFAULT";
  const address = await prisma.$transaction(async (tx) => {
    if (shouldDefault) {
      await tx.userAddress.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false, kind: "SECONDARY" } });
    }

    return tx.userAddress.create({
      data: {
        userId: user.id,
        label: parsed.data.label || null,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        address1: parsed.data.address1,
        address2: parsed.data.address2 || null,
        city: parsed.data.city,
        state: parsed.data.state,
        pincode: parsed.data.pincode,
        isDefault: shouldDefault,
        kind: normalizeKind(parsed.data.kind, shouldDefault),
      },
    });
  });

  return NextResponse.json({ ok: true, address });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.userAddress.findFirst({ where: { id: parsed.data.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  if (parsed.data.action === "delete") {
    await prisma.userAddress.delete({ where: { id: existing.id } });
    const defaultCount = await prisma.userAddress.count({ where: { userId: user.id, isDefault: true } });
    if (defaultCount === 0) {
      const next = await prisma.userAddress.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
      if (next) await prisma.userAddress.update({ where: { id: next.id }, data: { isDefault: true, kind: "DEFAULT" } });
    }
    return NextResponse.json({ ok: true });
  }

  const shouldDefault = parsed.data.action === "default" || parsed.data.address?.isDefault === true || parsed.data.address?.kind === "DEFAULT";
  const address = await prisma.$transaction(async (tx) => {
    if (shouldDefault) {
      await tx.userAddress.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false, kind: "SECONDARY" } });
    }

    const nextKind = normalizeKind(parsed.data.address?.kind ?? existing.kind, shouldDefault || existing.isDefault);

    return tx.userAddress.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.address?.label !== undefined ? { label: parsed.data.address.label || null } : {}),
        ...(parsed.data.address?.fullName !== undefined ? { fullName: parsed.data.address.fullName } : {}),
        ...(parsed.data.address?.phone !== undefined ? { phone: parsed.data.address.phone } : {}),
        ...(parsed.data.address?.address1 !== undefined ? { address1: parsed.data.address.address1 } : {}),
        ...(parsed.data.address?.address2 !== undefined ? { address2: parsed.data.address.address2 || null } : {}),
        ...(parsed.data.address?.city !== undefined ? { city: parsed.data.address.city } : {}),
        ...(parsed.data.address?.state !== undefined ? { state: parsed.data.address.state } : {}),
        ...(parsed.data.address?.pincode !== undefined ? { pincode: parsed.data.address.pincode } : {}),
        ...(parsed.data.address?.kind !== undefined || shouldDefault ? { kind: nextKind } : {}),
        ...(shouldDefault ? { isDefault: true } : {}),
      },
    });
  });

  return NextResponse.json({ ok: true, address });
}
