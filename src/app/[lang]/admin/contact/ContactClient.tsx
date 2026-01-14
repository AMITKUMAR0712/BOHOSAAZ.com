"use client";

import { useState } from "react";

type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "OPEN" | "REPLIED" | "CLOSED" | "NEW";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export default function ContactClient({
  initialMessages,
}: {
  initialMessages: ContactRow[];
}) {
  const [messages, setMessages] = useState<ContactRow[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"" | ContactRow["status"]>("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load({ reset }: { reset: boolean }) {
    setLoading(true);
    setMsg(null);

    const url = new URL("/api/admin/contact", window.location.origin);
    url.searchParams.set("take", "50");
    if (!reset && cursor) url.searchParams.set("cursor", cursor);
    if (status) url.searchParams.set("status", status);

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load messages");
      setLoading(false);
      return;
    }

    const rows = (data.data?.messages || []) as ContactRow[];
    const next = (data.data?.nextCursor || null) as string | null;

    if (reset) {
      setMessages(rows);
      setCursor(next);
      setHasMore(Boolean(next));
    } else {
      setMessages((prev) => [...prev, ...rows]);
      setCursor(next);
      setHasMore(Boolean(next));
    }

    setLoading(false);
  }

  async function refresh() {
    setSelectedId(null);
    await load({ reset: true });
  }

  async function sendReply(id: string) {
    const text = (replyDraft[id] || "").trim();
    if (!text) {
      setMsg("Reply cannot be empty");
      return;
    }

    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/admin/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ adminReply: text, sendEmail: true }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to send reply");
      setLoading(false);
      return;
    }

    const updated = data.data?.message as ContactRow | undefined;
    if (updated) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    }
    setLoading(false);
  }

  async function setMessageStatus(id: string, nextStatus: ContactRow["status"]) {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/admin/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to update status");
      setLoading(false);
      return;
    }

    const updated = data.data?.message as ContactRow | undefined;
    if (updated) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    }

    setLoading(false);
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;

    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/admin/contact/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to delete message");
      setLoading(false);
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
    setLoading(false);
  }

  function formatWhen(iso: string) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Contact Messages</h1>
      <p className="mt-1 text-sm text-gray-600">Customer inquiries inbox</p>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-4 flex items-center gap-3">
        <button className="text-sm underline" onClick={refresh} disabled={loading}>
          Refresh
        </button>

        <label className="text-sm text-gray-600">
          Status
          <select
            className="ml-2 rounded border px-2 py-1 text-sm"
            value={status}
            onChange={async (e) => {
              const nextStatus = e.target.value as "" | ContactRow["status"];
              setStatus(nextStatus);
              setCursor(null);
              setHasMore(true);
              setSelectedId(null);
              setTimeout(() => load({ reset: true }), 0);
            }}
            disabled={loading}
          >
            <option value="">All</option>
            <option value="OPEN">OPEN</option>
            <option value="REPLIED">REPLIED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-8 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">From</div>
          <div className="col-span-2">Subject</div>
          <div>Status</div>
          <div className="col-span-2">Message</div>
          <div>Actions</div>
        </div>

        {messages.map((m) => {
          const isSelected = selectedId === m.id;
          return (
            <div key={m.id} className="border-t">
              <div className="grid grid-cols-8 gap-2 p-3 text-sm">
                <div className="col-span-2">
                  <button
                    className="underline font-semibold"
                    onClick={() => setSelectedId(isSelected ? null : m.id)}
                    type="button"
                  >
                    {m.name}
                  </button>
                  <div className="text-xs text-gray-500">{m.email}</div>
                  <div className="text-xs text-gray-500">{formatWhen(m.createdAt)}</div>
                </div>
                <div className="col-span-2">
                  <div className="font-semibold">{m.subject}</div>
                  {m.repliedAt ? <div className="text-xs text-gray-500">Replied: {formatWhen(m.repliedAt)}</div> : null}
                </div>
                <div className="font-semibold">{m.status}</div>
                <div className="col-span-2 text-xs text-gray-700">
                  {m.message.length > 120 ? m.message.slice(0, 120) + "…" : m.message}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs underline"
                    onClick={() => setSelectedId(isSelected ? null : m.id)}
                    type="button"
                  >
                    {isSelected ? "Hide" : "View"}
                  </button>
                  <button
                    className="text-xs underline"
                    onClick={() => setMessageStatus(m.id, m.status === "CLOSED" ? "OPEN" : "CLOSED")}
                    disabled={loading}
                    type="button"
                  >
                    {m.status === "CLOSED" ? "Reopen" : "Close"}
                  </button>
                  <button
                    className="text-xs underline text-red-600"
                    onClick={() => deleteMessage(m.id)}
                    disabled={loading}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isSelected ? (
                <div className="bg-gray-50 p-4 text-sm">
                  <div className="font-semibold">Full message</div>
                  <div className="mt-1 whitespace-pre-wrap text-gray-700">{m.message}</div>

                  <div className="mt-4 font-semibold">Reply</div>
                  {m.adminReply ? (
                    <div className="mt-1 rounded border bg-white p-3 whitespace-pre-wrap">{m.adminReply}</div>
                  ) : (
                    <div className="mt-1 text-xs text-gray-500">No reply yet.</div>
                  )}

                  <textarea
                    className="mt-3 w-full min-h-30 rounded border bg-white p-3 text-sm"
                    placeholder="Type your reply..."
                    value={replyDraft[m.id] ?? ""}
                    onChange={(e) => setReplyDraft((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    disabled={loading}
                  />

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => sendReply(m.id)}
                      disabled={loading}
                      type="button"
                    >
                      Send Reply
                    </button>
                    <button
                      className="text-sm underline"
                      onClick={() => setMessageStatus(m.id, "REPLIED")}
                      disabled={loading}
                      type="button"
                    >
                      Mark as REPLIED
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          className="text-sm underline"
          onClick={() => load({ reset: false })}
          disabled={loading || !hasMore}
        >
          {hasMore ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}
