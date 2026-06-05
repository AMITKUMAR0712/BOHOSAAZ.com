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
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-72 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="overflow-hidden rounded-[44px] border border-border/80 bg-card/75 p-6 shadow-premium backdrop-blur-xl md:p-8">
          <div className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Contact
          </div>
          <h1 className="mt-4 font-heading text-4xl tracking-tight text-foreground md:text-6xl">
            We are here to help with every gift.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Need help choosing a product, tracking an order, or planning a special gift? Send us a message and our team will respond with care.
          </p>

          <div className="mt-8 grid gap-3">
            <div className="rounded-[28px] border border-border bg-background/65 p-5 shadow-sm backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Response time</div>
              <div className="mt-2 font-heading text-xl text-foreground">Within 24–48 hours</div>
              <div className="mt-1 text-sm text-muted-foreground">We reply on business days.</div>
            </div>

            <div className="rounded-[28px] border border-border bg-background/65 p-5 shadow-sm backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Gift support</div>
              <div className="mt-2 font-heading text-xl text-foreground">Product and order help</div>
              <div className="mt-1 text-sm text-muted-foreground">Ask about sizing, delivery, personalization or checkout.</div>
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-border/80 bg-card/85 p-6 shadow-premium backdrop-blur-xl md:p-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Send a message</div>
          <div className="mt-2 font-heading text-3xl tracking-tight text-foreground">Tell us what you need</div>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-12 rounded-2xl bg-background/70"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12 rounded-2xl bg-background/70"
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
                className="mt-2 min-h-[150px] w-full rounded-2xl border border-border bg-background/70 px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Tell us what you need…"
                required
              />
            </div>

            <Button
              type="submit"
              className="h-12 rounded-2xl uppercase tracking-[0.12em] shadow-sm"
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
