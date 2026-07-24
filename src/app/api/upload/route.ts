import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const BodySchema = z.object({
  purpose: z.enum(["products", "brand", "banner", "vendor_kyc", "vendor_logo", "support_ticket"]).optional(),
});

function isAllowedMime(mime: string, purpose: z.infer<typeof BodySchema>["purpose"]) {
  const images = new Set(["image/jpeg", "image/png", "image/webp"]);
  const videos = new Set(["video/mp4", "video/webm"]);
  if (purpose === "banner") {
    return images.has(mime) || videos.has(mime);
  }
  if (purpose === "vendor_kyc") {
    const kyc = new Set([...images, "application/pdf"]);
    return kyc.has(mime);
  }
  if (purpose === "support_ticket") {
    const docs = new Set([
      ...images,
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]);
    return docs.has(mime);
  }
  // products, brand, vendor_logo default to images only
  return images.has(mime);
}

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  if (mime === "application/pdf") return ".pdf";
  if (mime === "application/msword") return ".doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (mime === "text/plain") return ".txt";
  return "";
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Invalid form data" }, { status: 400 });

  const parsed = BodySchema.safeParse({ purpose: form.get("purpose") ?? undefined });
  const purpose = parsed.success ? parsed.data.purpose : undefined;

  // Authorization rules mirror the old signing route.
  if (purpose === "vendor_kyc" || purpose === "vendor_logo" || purpose === "support_ticket") {
    if (payload.role !== "USER" && payload.role !== "VENDOR" && payload.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    if (payload.role !== "VENDOR" && payload.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "File is required" }, { status: 400 });
  }

  // Products/brands: 25MB after client compress; banners keep a higher cap.
  const maxBytes = purpose === "banner" ? 60 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size <= 0) return Response.json({ error: "Empty file" }, { status: 400 });
  if (file.size > maxBytes) {
    const maxMb = Math.floor(maxBytes / 1024 / 1024);
    return Response.json(
      { error: `File too large (max ${maxMb}MB). Please use a smaller image.` },
      { status: 413 },
    );
  }

  const mime = (file.type || "").toLowerCase();
  if (!mime || !isAllowedMime(mime, purpose)) {
    return Response.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const safePurpose = purpose ?? "products";
  const userId = payload.sub;

  const subdir =
    safePurpose === "vendor_logo"
      ? path.join("vendor", "logo", userId)
      : safePurpose === "vendor_kyc"
        ? path.join("vendor", "kyc", userId)
        : safePurpose === "support_ticket"
          ? path.join("support", userId)
        : path.join(safePurpose, userId);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(uploadsDir, { recursive: true });

  const ext = extFromMime(mime) || path.extname(file.name || "").slice(0, 10);
  const filename = `${crypto.randomUUID()}${ext || ""}`;
  const absPath = path.join(uploadsDir, filename);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);

  const urlPath = `/uploads/${subdir.split(path.sep).join("/")}/${filename}`;

  return Response.json({ ok: true, url: urlPath });
}
