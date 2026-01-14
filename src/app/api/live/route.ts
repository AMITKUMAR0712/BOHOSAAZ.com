import { z } from "zod";
import { requireAdmin, requireUser, requireVendor } from "@/lib/auth";
import { getAdminDashboardMetrics, getUserDashboardMetrics, getVendorDashboardMetrics } from "@/lib/dashboard/metrics";
import { getLiveVersion } from "@/lib/live";

export const runtime = "nodejs";

const RoleSchema = z.enum(["user", "vendor", "admin"]);

type Metrics = Record<string, unknown>;

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roleParsed = RoleSchema.safeParse(url.searchParams.get("role"));
  if (!roleParsed.success) {
    return Response.json({ error: "Missing/invalid role" }, { status: 400 });
  }

  const role = roleParsed.data;

  // auth + scope
  let scope: { kind: "user"; userId: string } | { kind: "vendor"; vendorId: string } | { kind: "admin" };

  if (role === "user") {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    scope = { kind: "user", userId: user.id };
  } else if (role === "vendor") {
    const vendor = await requireVendor();
    if (!vendor || !vendor.vendor?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    scope = { kind: "vendor", vendorId: vendor.vendor.id };
  } else {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
    scope = { kind: "admin" };
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let lastVersion = -1;
      let lastHeartbeat = Date.now();

      const push = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      const heartbeat = () => {
        if (closed) return;
        // SSE comment as heartbeat
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        lastHeartbeat = Date.now();
      };

      const computeMetrics = async (): Promise<Metrics> => {
        if (scope.kind === "user") return getUserDashboardMetrics(scope.userId);
        if (scope.kind === "vendor") return getVendorDashboardMetrics(scope.vendorId);
        return getAdminDashboardMetrics();
      };

      const tick = async () => {
        try {
          const v = await getLiveVersion(scope);
          const shouldSend = v !== lastVersion;

          // periodic heartbeat even if no changes
          const needsHeartbeat = Date.now() - lastHeartbeat > 15000;

          if (shouldSend) {
            const metrics = await computeMetrics();
            push("metrics", metrics);
            lastVersion = v;
          } else if (needsHeartbeat) {
            heartbeat();
          }
        } catch (e) {
          push("error", { message: e instanceof Error ? e.message : "Stream error" });
        }
      };

      // initial send
      void (async () => {
        const metrics = await computeMetrics();
        push("metrics", metrics);
        lastVersion = await getLiveVersion(scope);
      })();

      const interval = setInterval(() => void tick(), 2000);

      const abort = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      // cleanup on client disconnect
      req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
