"use client";

import { useMemo, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  category: string;
  vendor: { id: string; shopName: string; status: string };
  creator: { id: string; email: string; name: string | null };
};

type Message = {
  id: string;
  senderRole: string;
  message: string;
  createdAt: string;
  isInternal: boolean;
};

export default function TicketClient({
  ticket,
  initialMessages,
}: {
  ticket: Ticket;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState<Ticket["status"]>(ticket.status);

  const sorted = useMemo(() => messages, [messages]);

  async function reload() {
    setMsg(null);
    const res = await fetch(`/api/admin/support/tickets/${ticket.id}/messages`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Failed to load messages");
    setMessages((data.data?.messages || []) as Message[]);
  }

  async function send() {
    setMsg(null);
    const m = text.trim();
    if (!m) return;

    const res = await fetch(`/api/admin/support/tickets/${ticket.id}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: m, isInternal }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Send failed");
    setText("");
    await reload();
  }

  async function setTicketStatus(next: Ticket["status"]) {
    setMsg(null);
    const res = await fetch(`/api/admin/support/tickets/${ticket.id}/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Update failed");
    setStatus(next);
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <div className="mt-1 text-sm text-gray-600">
            {ticket.category} • {ticket.vendor.shopName} • {ticket.creator.email}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setTicketStatus(e.target.value as Ticket["status"])}
          >
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-6 rounded-2xl border p-4">
        <div className="grid gap-3">
          {sorted.map((m) => (
            <div key={m.id} className="rounded-xl border p-3">
              <div className="text-xs text-gray-600 flex justify-between">
                <div>
                  <span className="font-semibold">{m.senderRole}</span>
                  {m.isInternal ? <span className="text-gray-500"> (internal)</span> : null}
                </div>
                <div>{new Date(m.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-sm">{m.message}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply"
          />
          <label className="text-xs text-gray-600 flex items-center gap-1">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
            />
            internal
          </label>
          <button className="rounded-lg bg-black text-white px-4 py-2 text-sm" onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
