"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import ExportDropdown from "@/components/ExportDropdown";

type TicketRow = {
  id: string;
  category: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  vendor: { id: string; shopName: string; status: string };
  creator: { id: string; email: string; name: string | null };
  messages: Array<{ message: string; senderRole: string; createdAt: string; isInternal: boolean }>;
};

export default function TicketsClient({
  lang,
  initialTickets,
}: {
  lang: string;
  initialTickets: TicketRow[];
}) {
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/support/tickets?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load tickets");
      setLoading(false);
      return;
    }
    setTickets((data.data?.tickets || []) as TicketRow[]);
    setLoading(false);
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Support Tickets</h1>
      <p className="mt-1 text-sm text-gray-600">Vendor ↔ Admin inbox</p>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filenameBase="Bohosaaz_Admin_SupportTickets"
            csv={{ href: "/api/export/admin/support-tickets.csv" }}
            pdf={{ href: "/api/export/admin/support-tickets.pdf" }}
          />
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-7 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">Subject</div>
          <div>Vendor</div>
          <div>Status</div>
          <div className="col-span-3">Latest</div>
        </div>

        {tickets.map((t) => {
          const last = t.messages?.[0];
          return (
            <div key={t.id} className="grid grid-cols-7 gap-2 p-3 text-sm border-t">
              <div className="col-span-2">
                <Link className="underline" href={`/${lang}/admin/support/tickets/${t.id}`}>
                  {t.subject}
                </Link>
                <div className="text-xs text-gray-600">{t.category}</div>
              </div>
              <div>
                <div className="font-semibold">{t.vendor.shopName}</div>
                <div className="text-xs text-gray-500">{t.creator.email}</div>
              </div>
              <div className="font-semibold">{t.status}</div>
              <div className="col-span-3 text-xs text-gray-700">
                {last ? (
                  <div>
                    <span className="font-semibold">{last.senderRole}</span>: {last.message}
                    {last.isInternal ? <span className="text-gray-500"> (internal)</span> : null}
                  </div>
                ) : (
                  <div className="text-gray-500">No messages</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
