"use client";

import { useRef, useState } from "react";

export type SupportAttachment = {
  url: string;
  name: string;
  type?: string;
  size?: number;
};

type PickerProps = {
  attachments: SupportAttachment[];
  onChange: (attachments: SupportAttachment[]) => void;
  disabled?: boolean;
  onError?: (message: string) => void;
};

const MAX_ATTACHMENTS = 5;

export function parseSupportAttachments(value: unknown): SupportAttachment[] {
  const raw = typeof value === "string" ? safeJsonParse(value) : value;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { url: item, name: fileNameFromUrl(item) };
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url : "";
      if (!url) return null;
      return {
        url,
        name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : fileNameFromUrl(url),
        type: typeof record.type === "string" ? record.type : undefined,
        size: typeof record.size === "number" ? record.size : undefined,
      };
    })
    .filter((item): item is SupportAttachment => Boolean(item))
    .slice(0, MAX_ATTACHMENTS);
}

export function SupportAttachmentList({ attachments }: { attachments: unknown }) {
  const parsed = parseSupportAttachments(attachments);
  if (!parsed.length) return null;

  return (
    <div className="mt-3 grid gap-2">
      {parsed.map((attachment) => (
        <div
          key={attachment.url}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="shrink-0 rounded-md bg-card px-2 py-1 text-[10px] font-medium">
              File
            </span>
            <span className="truncate">{attachment.name}</span>
            {attachment.size ? <span className="shrink-0 text-muted-foreground">({formatFileSize(attachment.size)})</span> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border bg-card px-2 py-1 hover:bg-muted/50">
              View
            </a>
            <a
              href={attachment.url}
              download={attachment.name}
              className="rounded-lg bg-black px-2 py-1 text-white hover:bg-black/80"
            >
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SupportAttachmentPicker({ attachments, onChange, disabled, onError }: PickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = [...attachments];
    const availableSlots = Math.max(0, MAX_ATTACHMENTS - next.length);
    const selected = Array.from(files).slice(0, availableSlots);
    if (!selected.length) {
      onError?.(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }

    setUploading(true);
    try {
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("purpose", "support_ticket");

        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed");
        next.push({ url: String(data.url), name: file.name, type: file.type || undefined, size: file.size });
      }
      onChange(next);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Attach documents</div>
          <div className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, JPG, PNG, WEBP up to 12MB each.</div>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted/40">
          {uploading ? "Uploading..." : "Add file"}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
            disabled={disabled || uploading}
            onChange={(event) => void uploadFiles(event.target.files)}
          />
        </label>
      </div>

      {attachments.length ? (
        <div className="mt-3 grid gap-2">
          {attachments.map((attachment) => (
            <div key={attachment.url} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-xs">
              <a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 truncate underline-offset-4 hover:underline">
                {attachment.name}
              </a>
              <div className="flex shrink-0 items-center gap-2">
                <a href={attachment.url} download={attachment.name} className="text-muted-foreground hover:text-foreground">
                  Download
                </a>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={disabled || uploading}
                  onClick={() => onChange(attachments.filter((item) => item.url !== attachment.url))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function fileNameFromUrl(url: string) {
  const clean = url.split("?")[0] || url;
  return decodeURIComponent(clean.split("/").pop() || "Attachment");
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
