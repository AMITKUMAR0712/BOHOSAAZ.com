"use client";

import { useMemo, useState } from "react";

async function downloadAs(url: string, filename: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExportDropdown({
  csv,
  pdf,
  filenameBase,
}: {
  csv?: { href: string; filename?: string };
  pdf?: { href: string; filename?: string };
  filenameBase: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.search || "";
  }, []);

  const canCsv = Boolean(csv?.href);
  const canPdf = Boolean(pdf?.href);

  async function onClick(kind: "csv" | "pdf") {
    setError(null);
    setLoading(kind);
    try {
      const cfg = kind === "csv" ? csv : pdf;
      const href = (cfg?.href || "") + qs;
      const fallback = `${filenameBase}_${todayIso()}.${kind}`;
      const filename = cfg?.filename || fallback;
      await downloadAs(href, filename);
      setOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Download failed";
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  if (!canCsv && !canPdf) return null;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="rounded-xl border px-4 py-2 text-sm disabled:opacity-60"
        disabled={loading !== null}
        onClick={() => setOpen((v) => !v)}
      >
        {loading ? "Exporting…" : "Export"}
      </button>

      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border bg-white shadow-sm">
          <div className="p-1">
            {canCsv ? (
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60"
                disabled={loading !== null}
                onClick={() => onClick("csv")}
              >
                Export CSV
              </button>
            ) : null}
            {canPdf ? (
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60"
                disabled={loading !== null}
                onClick={() => onClick("pdf")}
              >
                Export PDF
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
