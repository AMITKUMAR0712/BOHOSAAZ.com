import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

function has(v: string | undefined) {
  return Boolean(v && v.trim() && !v.includes("..."));
}

export default async function AdminSystemPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const checks = [
    { key: "DATABASE_URL", ok: has(process.env.DATABASE_URL) },
    { key: "JWT_SECRET", ok: has(process.env.JWT_SECRET) },
    { key: "UPSTASH_REDIS_REST_URL", ok: has(process.env.UPSTASH_REDIS_REST_URL) },
    { key: "UPSTASH_REDIS_REST_TOKEN", ok: has(process.env.UPSTASH_REDIS_REST_TOKEN) },
    { key: "CRON_SECRET", ok: has(process.env.CRON_SECRET) },
    { key: "COURIER_WEBHOOK_SECRET", ok: has(process.env.COURIER_WEBHOOK_SECRET) },
  ];

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">System</h1>
      <p className="mt-1 text-sm text-gray-600">Deployment health checks (env presence only).</p>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div>Key</div>
          <div>Status</div>
          <div>Notes</div>
        </div>
        {checks.map((c) => (
          <div key={c.key} className="grid grid-cols-3 gap-2 p-3 text-sm border-t">
            <div className="font-semibold">{c.key}</div>
            <div className={c.ok ? "font-semibold" : "text-red-600 font-semibold"}>{c.ok ? "OK" : "MISSING"}</div>
            <div className="text-xs text-gray-600">{c.ok ? "Present" : "Set in .env"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
