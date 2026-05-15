"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ExportDropdown from "@/components/ExportDropdown";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  orderId: string | null;
  returnRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: { message: string; senderRole: string; createdAt: string }[];
};

export default function AccountSupportPage() {
  const params = useParams<{ lang: string }>();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [category, setCategory] = useState("ORDER");
  const [priority, setPriority] = useState("MEDIUM");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [returnRequestId, setReturnRequestId] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/user/tickets", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load tickets");
      setTickets([]);
      setLoading(false);
      return;
    }
    setTickets((data.data?.tickets || []) as Ticket[]);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function createTicket() {
    setMsg(null);
    const res = await fetch("/api/user/tickets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        priority,
        subject,
        message,
        orderId: orderId.trim() ? orderId.trim() : undefined,
        returnRequestId: returnRequestId.trim() ? returnRequestId.trim() : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Create failed");
      return;
    }

    const id = (data.data?.ticketId as string | undefined) || undefined;
    setSubject("");
    setMessage("");
    setOrderId("");
    setReturnRequestId("");

    if (id) router.push(`/${params.lang}/account/support/${id}`);
    else await load();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Support</div>
          <div className="mt-1 text-sm text-gray-600">
            Create a ticket to contact Admin about orders, payments, or returns.
          </div>
          {msg ? <div className="mt-2 text-sm">{msg}</div> : null}
        </div>

        <ExportDropdown
          filenameBase="Bohosaaz_Tickets"
          csv={{ href: "/api/export/user/tickets.csv" }}
          pdf={{ href: "/api/export/user/tickets.pdf" }}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Create ticket</div>
        <div className="p-4 grid gap-3 max-w-2xl">
          <div>
            <label className="text-xs text-gray-600">Category</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ORDER">Order</option>
              <option value="PAYMENT">Payment</option>
              <option value="RETURN">Return</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">Priority</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">Subject</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Message</label>
            <textarea
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe the issue"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-gray-600">Order ID (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ord_..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Return Request ID (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={returnRequestId}
                onChange={(e) => setReturnRequestId(e.target.value)}
                placeholder="e.g. rr_..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
              disabled={subject.trim().length < 3 || message.trim().length < 1}
              onClick={createTicket}
            >
              Create ticket
            </button>
            <button className="rounded-xl border px-4 py-2 text-sm" onClick={load}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Your tickets</div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No tickets yet.</div>
        ) : (
          <div className="divide-y">
            {tickets.map((t) => {
              const last = t.messages?.[0];
              return (
                <Link
                  key={t.id}
                  href={`/${params.lang}/account/support/${t.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">{t.subject}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {t.category} • {t.priority} • {t.status}
                      </div>
                      {last?.message ? (
                        <div className="mt-2 text-xs text-gray-600 line-clamp-1">
                          Last: {last.message}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(t.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-600">
        Looking for returns? Go to <Link className="underline" href={`/${params.lang}/account/returns`}>Returns & refunds</Link>.
      </div>
    </div>
  );
}
