import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const BodySchema = z.object({
  purpose: z.enum(["products", "brand", "vendor_kyc", "vendor_logo"]).optional(),
});

function isAllowedMime(mime: string, purpose: z.infer<typeof BodySchema>["purpose"]) {
  const images = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (purpose === "vendor_kyc") {
    const kyc = new Set([...images, "application/pdf"]);
    return kyc.has(mime);
  }
  // products, brand, vendor_logo default to images only
  return images.has(mime);
}

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "application/pdf") return ".pdf";
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
  if (purpose === "vendor_kyc" || purpose === "vendor_logo") {
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

  const maxBytes = 12 * 1024 * 1024; // 12MB
  if (file.size <= 0) return Response.json({ error: "Empty file" }, { status: 400 });
  if (file.size > maxBytes) return Response.json({ error: "File too large (max 12MB)" }, { status: 413 });

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
