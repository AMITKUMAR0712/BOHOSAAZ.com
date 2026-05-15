import { verifyToken, type JwtPayload } from "@/lib/auth";
import { cookies } from "next/headers";

export type Role = "USER" | "VENDOR" | "ADMIN";

export async function requireAuth() {
  const store = await cookies();
  const token = store.get("token")?.value;
  if (!token) return null;

  try {
    const payload: JwtPayload = verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}

export async function requireRole(roles: Role[]) {
  const me = await requireAuth();
  if (!me) return { ok: false, status: 401 as const, error: "Unauthorized" };
  if (!roles.includes(me.role)) return { ok: false, status: 403 as const, error: "Forbidden" };
  return { ok: true, me };
}
