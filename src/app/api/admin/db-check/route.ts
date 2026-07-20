import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { formatDbError } from "@/lib/dbError";

const CHECKS = [
  { label: "order", run: () => prisma.order.count() },
  { label: "orderitem", run: () => prisma.orderItem.count() },
  { label: "user", run: () => prisma.user.count() },
  { label: "supportticket", run: () => prisma.supportTicket.count() },
  { label: "supportticketmessage", run: () => prisma.supportTicketMessage.count() },
  { label: "userticket", run: () => prisma.userTicket.count() },
  { label: "userticketmessage", run: () => prisma.userTicketMessage.count() },
] as const;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const results: Array<{ table: string; ok: boolean; count?: number; error?: string }> = [];

  for (const check of CHECKS) {
    try {
      const count = await check.run();
      results.push({ table: check.label, ok: true, count });
    } catch (error) {
      results.push({ table: check.label, ok: false, error: formatDbError(error) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return jsonOk({
    healthy: failed.length === 0,
    results,
    hint:
      failed.length > 0
        ? "Run `npx prisma migrate deploy` on the production server, then rebuild and restart the app."
        : null,
  });
}
