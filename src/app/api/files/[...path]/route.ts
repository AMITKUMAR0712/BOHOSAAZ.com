import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { resolveUploadFile } from "@/lib/uploadPaths";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const rel = (parts || []).map(decodeURIComponent).join("/");
  const abs = resolveUploadFile(rel);
  if (!abs || !existsSync(abs)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const st = statSync(abs);
    if (!st.isFile()) return new Response("Not found", { status: 404 });

    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const stream = createReadStream(abs);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(st.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
