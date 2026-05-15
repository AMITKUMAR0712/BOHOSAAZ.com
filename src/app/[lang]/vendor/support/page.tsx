"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: { message: string; senderRole: string; createdAt: string }[];
};

export default function VendorSupportPage() {
  const params = useParams<{ lang: string }>();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [category, setCategory] = useState("ORDER_ISSUE");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/vendor/support/tickets", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data?.error || "Failed");
      setTickets([]);
      setLoading(false);
      return;
    }
    setTickets(data.tickets || []);
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/vendor/support/tickets", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (ignore) return;
      if (!res.ok) {
        setMsg(data?.error || "Failed");
        setTickets([]);
        setLoading(false);
        return;
      }
      setTickets(data.tickets || []);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function createTicket() {
    setMsg(null);
    const res = await fetch("/api/vendor/support/tickets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, subject, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data?.error || "Create failed");
      return;
    }
    const id = data?.ticket?.id as string | undefined;
    setSubject("");
    setMessage("");
    if (id) router.push(`/${params.lang}/vendor/support/${id}`);
    else await load();
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-lg font-semibold">Support (Admin Tickets)</div>
        <div className="mt-1 text-sm text-gray-600">
          Vendors cannot contact customers directly. Use tickets to communicate with Admin.
        </div>

        {msg && <div className="mt-3 text-sm">{msg}</div>}

        <div className="mt-4 grid gap-3 max-w-2xl">
          <div>
            <label className="text-xs text-gray-600">Category</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ORDER_ISSUE">Order issue</option>
              <option value="PAYOUT_ISSUE">Payout issue</option>
              <option value="PRODUCT_ISSUE">Product issue</option>
              <option value="RETURNS_ISSUE">Returns issue</option>
              <option value="OTHER">Other</option>
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

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 text-sm font-semibold">Your tickets</div>

        {loading ? (
          <div className="p-6 text-sm">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No tickets yet.</div>
        ) : (
          <div className="divide-y">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/${params.lang}/vendor/support/${t.id}`}
                className="block px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{t.subject}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {t.category} • {t.status}
                    </div>
                    {t.messages?.[0]?.message ? (
                      <div className="mt-2 text-xs text-gray-600 line-clamp-1">
                        Last: {t.messages[0].message}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(t.updatedAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
