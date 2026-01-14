"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
};

type Message = {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachments: unknown;
  createdAt: string;
};

export default function AccountTicketDetailPage() {
  const params = useParams<{ lang: string; ticketId: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);

    const [tRes, mRes] = await Promise.all([
      fetch(`/api/user/tickets/${params.ticketId}`, { credentials: "include" }),
      fetch(`/api/user/tickets/${params.ticketId}/messages`, { credentials: "include" }),
    ]);

    const tData = await tRes.json().catch(() => null);
    const mData = await mRes.json().catch(() => null);

    if (!tRes.ok || !tData?.ok) {
      setMsg(tData?.error || "Failed");
      setTicket(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setTicket((tData.data?.ticket || null) as Ticket | null);
    if (mRes.ok && mData?.ok) setMessages((mData.data?.messages || []) as Message[]);
    else setMessages([]);

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ticketId]);

  async function send() {
    setMsg(null);
    const m = text.trim();
    if (!m) return;

    const res = await fetch(`/api/user/tickets/${params.ticketId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: m }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Send failed");
      return;
    }

    setText("");
    await load();
  }

  return (
    <div className="grid gap-4">
      <div className="text-sm">
        <Link className="hover:underline" href={`/${params.lang}/account/support`}>
          ← Back to tickets
        </Link>
      </div>

      {msg ? <div className="text-sm">{msg}</div> : null}

      {loading ? (
        <div className="rounded-2xl border p-6 text-sm text-gray-600">Loading…</div>
      ) : !ticket ? (
        <div className="rounded-2xl border p-6 text-sm text-gray-600">Not found.</div>
      ) : (
        <>
          <div className="rounded-2xl border p-6">
            <div className="text-lg font-semibold">{ticket.subject}</div>
            <div className="mt-1 text-xs text-gray-600">
              {ticket.category} • {ticket.priority} • {ticket.status} • Updated{" "}
              {new Date(ticket.updatedAt).toLocaleString()}
            </div>
            {ticket.orderId ? (
              <div className="mt-2 text-xs text-gray-600">Order ID: {ticket.orderId}</div>
            ) : null}
            {ticket.returnRequestId ? (
              <div className="mt-1 text-xs text-gray-600">Return Request ID: {ticket.returnRequestId}</div>
            ) : null}
          </div>

          <div className="rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 text-sm font-semibold">Messages</div>
            <div className="p-6 grid gap-3">
              {messages.length === 0 ? (
                <div className="text-sm text-gray-600">No messages.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="rounded-xl border p-3">
                    <div className="text-xs text-gray-600">
                      {m.senderRole} • {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm">{m.message}</div>
                  </div>
                ))
              )}

              <div className="mt-2 grid gap-2">
                <textarea
                  className="w-full rounded-lg border px-3 py-2"
                  rows={3}
                  placeholder="Write a message to Admin"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  className="w-fit rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                  disabled={text.trim().length < 1 || ticket.status === "CLOSED"}
                  onClick={send}
                >
                  Send
                </button>
                {ticket.status === "CLOSED" ? (
                  <div className="text-xs text-gray-600">This ticket is closed.</div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
