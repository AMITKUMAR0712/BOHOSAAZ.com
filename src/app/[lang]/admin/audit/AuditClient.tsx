"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";

type AuditRow = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export default function AuditClient() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load(first = false) {
    setLoading(true);
    setMsg(null);

    const url = new URL("/api/admin/audit", window.location.origin);
    url.searchParams.set("take", "50");
    if (!first && cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load logs");
      setLoading(false);
      return;
    }

    const next = (data.data?.logs || []) as AuditRow[];
    const nextCursor = (data.data?.nextCursor || null) as string | null;

    setLogs((prev) => (first ? next : [...prev, ...next]));
    setCursor(nextCursor);
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Security and admin actions history.</CardDescription>
        </CardHeader>
        <CardContent>
          {msg ? <div className="mb-4 text-sm text-muted-foreground">{msg}</div> : null}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
              Refresh
            </Button>
            {cursor ? (
              <Button variant="ghost" size="sm" onClick={() => load(false)} disabled={loading}>
                Load more
              </Button>
            ) : null}
          </div>

          <div className="mt-4">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>IP</TH>
                  <TH>Meta</TH>
                </TR>
              </THead>

              <tbody>
                {logs.length === 0 && !loading ? (
                  <TR>
                    <TD colSpan={6} className="text-sm text-muted-foreground">
                      No logs yet.
                    </TD>
                  </TR>
                ) : null}

                {logs.map((r) => (
                  <TR key={r.id}>
                    <TD className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TD>
                    <TD>
                      <div className="font-semibold">{r.actorRole || "-"}</div>
                      <div className="text-xs text-muted-foreground">{r.actorId || "-"}</div>
                    </TD>
                    <TD className="font-semibold">{r.action}</TD>
                    <TD>
                      <div className="font-semibold">{r.entity || "-"}</div>
                      <div className="text-xs text-muted-foreground">{r.entityId || "-"}</div>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{r.ip || "-"}</TD>
                    <TD className="text-xs text-muted-foreground break-words">
                      {r.meta ? JSON.stringify(r.meta).slice(0, 120) : "-"}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
