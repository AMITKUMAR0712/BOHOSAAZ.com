import { NextRequest } from "next/server";

// NOTE: This route existed as a duplicate handler and was unsafe (no auth / ownership checks).
// The supported vendor status update endpoint is:
//   PATCH /api/vendor/order-items/:itemId
// This duplicate is intentionally disabled.
export async function PATCH(
  _req: NextRequest,
  _ctx: { params: Promise<{ itemId: string; id: string }> }
) {
  return Response.json({ error: "Not found" }, { status: 404 });
}
