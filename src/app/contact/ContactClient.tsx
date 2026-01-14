"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function ContactClient() {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send message");

      setName("");
      setEmail("");
      setMessage("");

      toast({
        variant: "success",
        title: "Message sent",
        message: "Thanks for reaching out. We will get back to you soon.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast({ variant: "danger", title: "Contact", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Contact
          </div>
          <h1 className="mt-4 font-heading text-4xl md:text-5xl tracking-tight text-foreground">
            Let’s talk craft
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
            Have a question about an order, a product, or partnering as a seller? Send a message and our team will respond.
          </p>

          <div className="mt-8 grid gap-3">
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Response time</div>
              <div className="mt-2 font-heading text-xl text-foreground">Within 24–48 hours</div>
              <div className="mt-1 text-sm text-muted-foreground">We reply on business days.</div>
            </div>

            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">For sellers</div>
              <div className="mt-2 font-heading text-xl text-foreground">Apply to sell</div>
              <div className="mt-1 text-sm text-muted-foreground">Use the Seller page to start your vendor application.</div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-card/80 backdrop-blur-xl p-6 md:p-8 shadow-premium">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Send a message</div>
          <div className="mt-2 font-heading text-2xl tracking-tight">We’ll get back to you</div>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 rounded-2xl"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 rounded-2xl"
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Message</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 w-full min-h-[140px] rounded-2xl border border-border bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Tell us what you need…"
                required
              />
            </div>

            <Button
              type="submit"
              className="h-11 rounded-2xl uppercase tracking-[0.12em]"
              disabled={loading}
            >
              {loading ? "SENDING..." : "SEND MESSAGE"}
            </Button>

            <div className="text-xs text-muted-foreground">
              By submitting, you agree we may reply to your email.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
