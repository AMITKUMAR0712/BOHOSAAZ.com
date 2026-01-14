import { v2 as cloudinary } from "cloudinary";
import { requireCloudinary } from "@/lib/env";

type CloudinaryCreds = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function nonEmpty(v: string | null | undefined) {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

function parseCloudinaryUrl(url: string): CloudinaryCreds {
  // CLOUDINARY_URL format: cloudinary://<api_key>:<api_secret>@<cloud_name>
  const parsed = new URL(url);
  const cloudName = parsed.hostname;
  const apiKey = decodeURIComponent(parsed.username);
  const apiSecret = decodeURIComponent(parsed.password);
  if (!nonEmpty(cloudName) || !nonEmpty(apiKey) || !nonEmpty(apiSecret)) {
    throw new Error("Invalid CLOUDINARY_URL (expected cloudinary://<api_key>:<api_secret>@<cloud_name>)");
  }
  return { cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
}

let configured = false;

export function requireCloudinaryClient(): { cloudinary: typeof cloudinary; creds: CloudinaryCreds; folder: string } {
  const cfg = requireCloudinary();

  const creds: CloudinaryCreds = cfg.cloudinaryUrl
    ? parseCloudinaryUrl(cfg.cloudinaryUrl)
    : {
        cloudName: cfg.cloudName || "",
        apiKey: cfg.apiKey || "",
        apiSecret: cfg.apiSecret || "",
      };

  if (!nonEmpty(creds.cloudName) || !nonEmpty(creds.apiKey) || !nonEmpty(creds.apiSecret)) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET"
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: creds.cloudName,
      api_key: creds.apiKey,
      api_secret: creds.apiSecret,
      secure: true,
    });
    configured = true;
  }

  const folder = nonEmpty(cfg.folder) ? cfg.folder!.trim() : "bohosaaz";
  return { cloudinary, creds, folder };
}

// Export raw SDK for places that don't need credentials (but do not rely on it being configured).
export { cloudinary };
