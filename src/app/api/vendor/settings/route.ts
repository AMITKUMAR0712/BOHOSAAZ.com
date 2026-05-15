import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

const patchSchema = z.object({
  pickupName: z.string().min(1).max(191).optional().nullable(),
  pickupPhone: z.string().min(1).max(191).optional().nullable(),
  pickupAddress1: z.string().min(1).max(191).optional().nullable(),
  pickupAddress2: z.string().max(191).optional().nullable(),
  pickupCity: z.string().min(1).max(191).optional().nullable(),
  pickupState: z.string().min(1).max(191).optional().nullable(),
  pickupPincode: z.string().min(1).max(191).optional().nullable(),
});

async function requireVendor(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: "Unauthorized" as const, status: 401 as const };

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  if (payload.role !== "VENDOR") {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return { error: "Vendor profile not found" as const, status: 404 as const };
  if (vendor.status !== "APPROVED") return { error: "Vendor not approved" as const, status: 403 as const };

  return { payload, vendor } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const vendor = await prisma.vendor.findUnique({
    where: { id: auth.vendor.id },
    select: {
      id: true,
      shopName: true,
      pickupName: true,
      pickupPhone: true,
      pickupAddress1: true,
      pickupAddress2: true,
      pickupCity: true,
      pickupState: true,
      pickupPincode: true,
    },
  });

  return Response.json({ vendor });
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimit(
    `vendor:settings:update:${req.headers.get("x-forwarded-for") || "ip"}`
  );
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const auth = await requireVendor(req);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const updated = await prisma.vendor.update({
    where: { id: auth.vendor.id },
    data: {
      pickupName: parsed.data.pickupName ?? undefined,
      pickupPhone: parsed.data.pickupPhone ?? undefined,
      pickupAddress1: parsed.data.pickupAddress1 ?? undefined,
      pickupAddress2: parsed.data.pickupAddress2 ?? undefined,
      pickupCity: parsed.data.pickupCity ?? undefined,
      pickupState: parsed.data.pickupState ?? undefined,
      pickupPincode: parsed.data.pickupPincode ?? undefined,
    },
    select: {
      id: true,
      shopName: true,
      pickupName: true,
      pickupPhone: true,
      pickupAddress1: true,
      pickupAddress2: true,
      pickupCity: true,
      pickupState: true,
      pickupPincode: true,
    },
  });

  await audit({
    actorId: auth.payload.sub,
    actorRole: auth.payload.role,
    action: "VENDOR_SETTINGS_UPDATE",
    entity: "Vendor",
    entityId: auth.vendor.id,
    meta: parsed.data,
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ vendor: updated });
}
