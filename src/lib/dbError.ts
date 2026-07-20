export function formatDbError(error: unknown): string {
  if (!error || typeof error !== "object") return "Unknown database error";

  const e = error as {
    code?: string;
    message?: string;
    meta?: { table?: string; column?: string; modelName?: string };
  };

  const parts: string[] = [];
  if (e.code) parts.push(e.code);
  if (e.meta?.table) parts.push(`table=${e.meta.table}`);
  if (e.meta?.column) parts.push(`column=${e.meta.column}`);
  if (e.meta?.modelName) parts.push(`model=${e.meta.modelName}`);
  if (e.message) parts.push(e.message.split("\n")[0]);

  return parts.join(" | ") || "Unknown database error";
}
