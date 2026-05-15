import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getJwtSecret } from "@/lib/env";

export type JwtRole = "USER" | "VENDOR" | "ADMIN";

export type JwtPayload = {
  sub: string; // userId
  role: JwtRole;
  email: string;
};

const secret = getJwtSecret();

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export async function requireUser() {
  const store = await cookies();
  const token = store.get("token")?.value;
  if (!token) return null;

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        vendor: { select: { id: true, status: true, shopName: true } },
      },
    });

    if (!user) return null;
    if (user.isBlocked) return null;

    return user;
  } catch (err) {
    console.error("[auth] requireUser failed:", err);
    return null;
  }
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user) return null;
  return user.role === "ADMIN" ? user : null;
}

export async function requireVendor() {
  const user = await requireUser();
  if (!user) return null;
  if (user.role !== "VENDOR") return null;
  if (!user.vendor) return null;
  return user;
}

export async function requireApprovedVendor() {
  const user = await requireVendor();
  if (!user) return null;
  if (user.vendor?.status !== "APPROVED") return null;
  return user;
}
