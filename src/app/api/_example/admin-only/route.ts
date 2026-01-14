import { NextRequest } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["admin"]);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  return jsonOk({
    message: "Admin-only endpoint OK",
    userId: auth.payload.sub,
    role: auth.payload.appRole,
  });
}
