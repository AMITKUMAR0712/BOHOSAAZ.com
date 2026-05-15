function escapeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[^\S\r\n]*[\r\n",]/.test(s) || s.startsWith(" ") || s.endsWith(" ")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsvWithHeaders(headers: string[], rows: Array<Record<string, unknown>>) {
  const lines: string[] = [];
  lines.push(headers.join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h])).join(","));
  }
  return lines.join("\n");
}

export function csvDownloadResponse(filename: string, csv: string) {
  // Intentionally no BOM: strict UTF-8.
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
