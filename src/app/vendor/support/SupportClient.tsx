"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { MessageSquare, Plus, Send, Clock } from "lucide-react";
import {
  SupportAttachmentList,
  SupportAttachmentPicker,
  type SupportAttachment,
} from "@/components/support/SupportAttachments";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  _count?: { messages: number };
};

type Message = {
  id: string;
  senderRole: string;
  message: string;
  createdAt: string;
  attachments?: unknown;
};

export default function SupportClient({ userId: _userId }: { userId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<SupportAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("ORDER_ISSUE");
  const [initialMessage, setInitialMessage] = useState("");
  const [createAttachments, setCreateAttachments] = useState<SupportAttachment[]>([]);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/support");
      const data = await res.json();
      if (res.ok) setTickets(data.tickets);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(ticketId: string) {
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/vendor/support/${ticketId}`);
      const data = await res.json();
      if (res.ok) setMessages(data.ticket.messages);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setMsgLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    const interval = window.setInterval(() => {
      void loadMessages(selectedTicket.id);
      void loadTickets();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [selectedTicket]);

  async function createTicket() {
    if (!subject || !initialMessage) return;
    try {
      const res = await fetch("/api/vendor/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, message: initialMessage, attachments: createAttachments }),
      });
      if (res.ok) {
        toast.success("Ticket created");
        setShowCreate(false);
        setSubject("");
        setInitialMessage("");
        setCreateAttachments([]);
        loadTickets();
      }
    } catch {
      toast.error("Failed to create ticket");
    }
  }

  async function sendMessage() {
    const message = newMsg.trim();
    if ((!message && replyAttachments.length === 0) || !selectedTicket) return;
    setSending(true);
    try {
      const res = await fetch(`/api/vendor/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || "Attached file", attachments: replyAttachments }),
      });
      if (res.ok) {
        setNewMsg("");
        setReplyAttachments([]);
        loadMessages(selectedTicket.id);
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support & Messaging</h1>
          <p className="text-muted-foreground">Talk to BOHOSAAZ Admin team.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tickets List */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No tickets found.
              </CardContent>
            </Card>
          ) : (
            tickets.map((t) => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedTicket?.id === t.id ? "border-primary ring-1 ring-primary" : ""
                  }`}
                onClick={() => {
                  setSelectedTicket(t);
                  loadMessages(t.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-primary">{t.category}</span>
                    <span className={`text-[10px] font-bold uppercase ${t.status === "OPEN" ? "text-green-600" : "text-gray-500"
                      }`}>
                      {t.status}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold line-clamp-1">{t.subject}</h3>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                    <span>{t._count?.messages || 0} messages</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Messaging Area */}
        <div className="md:col-span-2">
          {showCreate ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
                <CardDescription>We usually respond within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="ORDER_ISSUE">Order Issue</option>
                    <option value="PRODUCT_ISSUE">Product Listing</option>
                    <option value="PAYOUT_ISSUE">Payment/Payout</option>
                    <option value="RETURNS_ISSUE">Returns Issue</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="e.g. Issue with Order #12345"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    className="min-h-32 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Describe your issue in detail..."
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                  />
                </div>
                <SupportAttachmentPicker attachments={createAttachments} onChange={setCreateAttachments} onError={toast.error} />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button onClick={createTicket} disabled={!subject || !initialMessage}>Create Ticket</Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTicket ? (
            <Card className="flex h-[600px] flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                <CardDescription>Status: {selectedTicket.status}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgLoading ? (
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderRole === "VENDOR" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.senderRole === "VENDOR"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                          }`}
                      >
                        <div className="mb-1 text-[10px] opacity-70">
                          {m.senderRole === "ADMIN" ? "BOHOSAAZ Admin" : "You"} • {new Date(m.createdAt).toLocaleTimeString()}
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        <SupportAttachmentList attachments={m.attachments} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              <div className="border-t p-4">
                <div className="grid gap-3">
                  <SupportAttachmentPicker
                    attachments={replyAttachments}
                    onChange={setReplyAttachments}
                    disabled={sending || selectedTicket.status === "CLOSED"}
                    onError={toast.error}
                  />
                  <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button onClick={sendMessage} disabled={sending || (!newMsg.trim() && replyAttachments.length === 0) || selectedTicket.status === "CLOSED"}>
                    <Send className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground p-10">
              <MessageSquare className="mb-4 h-12 w-12 opacity-20" />
              <p>Select a ticket to view messages or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
