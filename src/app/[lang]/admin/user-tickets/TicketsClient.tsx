"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function TicketsClient({ lang }: { lang: string }) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteTicket(id: string, subject: string) {
    if (!window.confirm(`Delete ticket "${subject}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/user-tickets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Failed to delete ticket");
        return;
      }
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

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
    setTickets(
      ((data.data?.tickets || []) as TicketRow[]).map((t) => ({
        ...t,
        user: t.user ?? { id: "unknown", email: "Unknown user", name: null, phone: null },
        messages: (t.messages || []).map((m) => ({
          ...m,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
        })),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">User Tickets</h1>
      <p className="mt-1 text-sm text-gray-600">User ↔ Admin inbox</p>

      {msg ? <div className="mt-3 text-sm text-red-600">{msg}</div> : null}
      {loading && !tickets.length && !msg ? (
        <div className="mt-3 text-sm text-gray-600">Loading user tickets...</div>
      ) : null}

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
          <div className="col-span-2">Latest</div>
          <div className="text-right">Actions</div>
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
                <div className="font-semibold">{t.user?.name || "User"}</div>
                <div className="text-xs text-gray-500">{t.user?.email || "Unknown user"}</div>
              </div>
              <div className="font-semibold">{t.status}</div>
              <div className="col-span-2 text-xs text-gray-700">
                {last ? (
                  <div>
                    <span className="font-semibold">{last.senderRole}</span>: {last.message}
                  </div>
                ) : (
                  <div className="text-gray-500">No messages</div>
                )}
              </div>
              <div className="flex items-start justify-end">
                <button
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  onClick={() => deleteTicket(t.id, t.subject)}
                  disabled={deletingId === t.id}
                >
                  {deletingId === t.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
        {!loading && !tickets.length ? (
          <div className="border-t p-6 text-center text-sm text-gray-600">No user tickets found.</div>
        ) : null}
      </div>
    </div>
  );
}
