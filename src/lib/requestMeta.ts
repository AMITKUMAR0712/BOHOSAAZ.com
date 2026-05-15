import type { NextRequest } from "next/server";

export function getIpFromRequest(req: NextRequest | Request) {
  const headers = req.headers;
  const xfwd = headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0]?.trim();
  const xri = headers.get("x-real-ip");
  return xri || undefined;
}

export function getUserAgentFromRequest(req: NextRequest | Request) {
  return req.headers.get("user-agent") || undefined;
}
