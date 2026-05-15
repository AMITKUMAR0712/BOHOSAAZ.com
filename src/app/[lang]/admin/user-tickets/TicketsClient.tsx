"use client";

import Link from "next/link";
import { useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

type TicketRow = {
  id: string;
  category: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: string;
  createdAt: string;
  updatedAt: string;
  orderId: string | null;
  returnRequestId: string | null;
  user: { id: string; email: string; name: string | null; phone: string | null };
  messages: Array<{ message: string; senderRole: string; createdAt: string }>;
};

export default function TicketsClient({
  lang,
  initialTickets,
}: {
  lang: string;
  initialTickets: TicketRow[];
}) {
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/user-tickets?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load tickets");
      setLoading(false);
      return;
    }
    setTickets((data.data?.tickets || []) as TicketRow[]);
    setLoading(false);
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">User Tickets</h1>
      <p className="mt-1 text-sm text-gray-600">User ↔ Admin inbox</p>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filenameBase="Bohosaaz_Admin_Tickets"
            csv={{ href: "/api/export/admin/tickets.csv" }}
            pdf={{ href: "/api/export/admin/tickets.pdf" }}
          />
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-7 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">Subject</div>
          <div>User</div>
          <div>Status</div>
          <div className="col-span-3">Latest</div>
        </div>

        {tickets.map((t) => {
          const last = t.messages?.[0];
          return (
            <div key={t.id} className="grid grid-cols-7 gap-2 p-3 text-sm border-t">
              <div className="col-span-2">
                <Link className="underline" href={`/${lang}/admin/user-tickets/${t.id}`}>
                  {t.subject}
                </Link>
                <div className="text-xs text-gray-600">
                  {t.category} • {t.priority}
                </div>
              </div>
              <div>
                <div className="font-semibold">{t.user.name || "User"}</div>
                <div className="text-xs text-gray-500">{t.user.email}</div>
              </div>
              <div className="font-semibold">{t.status}</div>
              <div className="col-span-3 text-xs text-gray-700">
                {last ? (
                  <div>
                    <span className="font-semibold">{last.senderRole}</span>: {last.message}
                  </div>
                ) : (
                  <div className="text-gray-500">No messages</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
