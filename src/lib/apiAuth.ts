import { NextRequest } from "next/server";
import { verifyToken, type JwtPayload, type JwtRole } from "@/lib/auth";

export type AppRole = "admin" | "vendor" | "user";

function toAppRole(role: JwtRole): AppRole {
  if (role === "ADMIN") return "admin";
  if (role === "VENDOR") return "vendor";
  return "user";
}

export function getAuthToken(req: NextRequest) {
  const cookieToken = req.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export function getAuthPayload(req: NextRequest): (JwtPayload & { appRole: AppRole }) | null {
  const token = getAuthToken(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return { ...payload, appRole: toAppRole(payload.role) };
  } catch {
    return null;
  }
}

export function requireRole(req: NextRequest, allowed: AppRole[]) {
  const payload = getAuthPayload(req);
  if (!payload) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" as const };
  }
  if (!allowed.includes(payload.appRole)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" as const };
  }
  return { ok: true as const, payload };
}
