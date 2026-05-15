"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  createdAt: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldHideOnPath(pathname: string) {
  return /(^|\/)(admin|vendor|seller)(\/|$)/i.test(pathname);
}

const QUICK_ACTIONS = [
  { label: "Track my order", message: "Track my order" },
  { label: "Return policy", message: "What is your return policy?" },
  { label: "Shipping", message: "What are your shipping times and charges?" },
  { label: "Coupons", message: "Do you have any active coupons and how do I apply them?" },
  { label: "Vendor apply", message: "How do I become a vendor and complete KYC?" },
] as const;

const LS_KEY = "bohosaaz_chatbot_v1";

function safeParseMessages(value: string | null): ChatMessage[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    const msgs: ChatMessage[] = [];
    for (const it of parsed) {
      if (!it || typeof it !== "object") continue;
      const m = it as Partial<ChatMessage>;
      if (typeof m.id !== "string") continue;
      if (m.role !== "user" && m.role !== "assistant") continue;
      if (typeof m.content !== "string") continue;
      if (typeof m.createdAt !== "number") continue;
      const sources = Array.isArray(m.sources) ? m.sources.filter((s) => typeof s === "string") : undefined;
      msgs.push({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt, sources });
    }
    return msgs.length ? msgs : null;
  } catch {
    return null;
  }
}

export default function ChatbotWidget({ className }: { className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => {
    // Hydration-safe default; we restore from localStorage in an effect.
    return [
      {
        id: uid(),
        role: "assistant",
        content:
          "Hi! I’m the Bohosaaz assistant. Ask me about products, orders, returns, shipping, coupons, or becoming a vendor.",
        createdAt: Date.now(),
      },
    ];
  });

  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  React.useEffect(() => {
    // Restore chat history after mount.
    try {
      const restored = safeParseMessages(localStorage.getItem(LS_KEY));
      if (restored) setMessages(restored);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    // Persist chat history.
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore
    }
  }, [messages]);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  if (pathname && shouldHideOnPath(pathname)) return null;

  async function send(messageText: string) {
    const text = messageText.trim();
    if (!text) return;

    setInput("");
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    setTyping(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, page: pathname || "/", stream: true }),
      });

      if (!res.ok) {
        let errText = "Sorry — something went wrong.";
        if (res.status === 429) errText = "You’re sending messages too quickly. Please wait a moment and try again.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) errText = j.error;
        } catch {
          // ignore
        }
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: errText, createdAt: Date.now() }]);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const isSse = contentType.includes("text/event-stream");

      if (!isSse || !res.body) {
        // Fallback to JSON response.
        const data = (await res.json()) as { answer?: string; sources?: string[] };
        const sources = Array.isArray(data.sources) ? data.sources.filter((s) => typeof s === "string") : undefined;
        const answer = data.answer || "Sorry — I couldn’t generate a response.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: answer, createdAt: Date.now(), sources }]);
        return;
      }

      const botId = uid();
      setMessages((prev) => [...prev, { id: botId, role: "assistant", content: "", createdAt: Date.now() }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const applyDelta = (delta: string) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, content: (m.content || "") + delta } : m)),
        );
      };

      const applySources = (sources: string[]) => {
        setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, sources } : m)));
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (\n\n delimited)
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const lines = rawEvent.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          const event = eventLine ? eventLine.slice("event:".length).trim() : "message";
          const dataRaw = dataLine ? dataLine.slice("data:".length).trim() : "{}";

          try {
            const payload: unknown = JSON.parse(dataRaw);
            const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

            if (event === "meta") {
              const rawSources = obj?.sources;
              const sources = Array.isArray(rawSources) ? rawSources.filter((s) => typeof s === "string") : [];
              if (sources.length) applySources(sources);
            } else if (event === "delta") {
              const delta = typeof obj?.delta === "string" ? obj.delta : "";
              if (delta) applyDelta(delta);
            } else if (event === "done") {
              // no-op
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch {
      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "Sorry — I couldn’t reach the server. Please try again in a moment.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className={cn("fixed bottom-5 left-5 z-50", className)}>
      <div className="flex flex-col items-start gap-3">
        {open ? (
          <div
            className={cn(
              "w-90 max-w-[calc(100vw-2.5rem)]",
              "rounded-2xl border border-border bg-card/95 backdrop-blur shadow-premium overflow-hidden",
            )}
            role="dialog"
            aria-label="Bohosaaz chatbot"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">Bohosaaz Assistant</div>
                <div className="text-xs text-muted-foreground">Website & order help</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "h-9 px-3 inline-flex items-center rounded-2xl border border-border bg-card hover:bg-muted/50 transition",
                    "text-xs text-muted-foreground hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  onClick={() => {
                    const fresh: ChatMessage[] = [
                      {
                        id: uid(),
                        role: "assistant",
                        content:
                          "Hi! I’m the Bohosaaz assistant. Ask me about products, orders, returns, shipping, coupons, or becoming a vendor.",
                        createdAt: Date.now(),
                      },
                    ];
                    setMessages(fresh);
                    try {
                      localStorage.removeItem(LS_KEY);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Clear
                </button>

                <button
                  type="button"
                  className={cn(
                    "h-9 w-9 grid place-items-center rounded-2xl border border-border bg-card hover:bg-muted/50 transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  aria-label="Close chatbot"
                  onClick={() => setOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInput("Track my order ");
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-(--radius) border border-border bg-muted/30 hover:bg-muted/50 transition",
                    "text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                >
                  Track order (ID)
                </button>
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => send(a.message)}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-(--radius) border border-border bg-muted/30 hover:bg-muted/50 transition",
                      "text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={listRef} className="h-90 max-h-[52vh] overflow-auto px-3 py-3 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl border border-border px-3 py-2 text-sm leading-relaxed",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-foreground",
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.role === "assistant" && m.sources && m.sources.length ? (
                      <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
                        Sources: {m.sources.slice(0, 4).join(" • ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {typing ? (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1" aria-label="Assistant is typing">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce motion-reduce:animate-none [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce motion-reduce:animate-none [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce motion-reduce:animate-none" />
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <form
              className="border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about products, orders, returns…"
                  className={cn(
                    "h-10 w-full rounded-(--radius) border border-border bg-card px-3 text-sm text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                  maxLength={800}
                />
                <button
                  type="submit"
                  disabled={typing || input.trim().length === 0}
                  className={cn(
                    "h-10 w-10 grid place-items-center rounded-2xl border border-border bg-card hover:bg-muted/50 transition",
                    "disabled:opacity-60 disabled:pointer-events-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12h13M14 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "h-11 px-4 inline-flex items-center gap-2 rounded-2xl border border-border bg-card/85 backdrop-blur shadow-premium transition",
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-label={open ? "Close chatbot" : "Open chatbot"}
        >
          <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7A3.5 3.5 0 0 1 16.5 16H10l-4 4v-4.5A3.5 3.5 0 0 1 4 12.5v-7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm font-semibold text-foreground">Chatbot</span>
        </button>
      </div>
    </div>
  );
}
