import { NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { requireCloudinaryClient } from "@/lib/cloudinary";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      purpose: z.enum(["products", "brand", "vendor_kyc", "vendor_logo"]).optional(),
    })
    .safeParse(body);
  const purpose = parsed.success ? parsed.data.purpose : undefined;

  const timestamp = Math.round(Date.now() / 1000);
  const { cloudinary, creds, folder: baseFolder } = requireCloudinaryClient();
  let folder = `${baseFolder}/products`;

  if (purpose === "vendor_kyc" || purpose === "vendor_logo") {
    // Allow users to upload KYC docs / logo before they become vendors.
    if (payload.role !== "USER" && payload.role !== "VENDOR" && payload.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const base = `${baseFolder}/vendor`;
    folder = purpose === "vendor_logo" ? `${base}/logo/${payload.sub}` : `${base}/kyc/${payload.sub}`;
  } else {
    // Product/brand uploads: vendors + admins only.
    if (payload.role !== "VENDOR" && payload.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, creds.apiSecret);

  return Response.json({
    timestamp,
    signature,
    folder,
    cloudName: creds.cloudName,
    apiKey: creds.apiKey,
  });
}
