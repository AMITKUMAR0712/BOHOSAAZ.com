import { NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { requireCloudinaryClient } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Any authenticated user can upload their vendor logo during application.
  // This endpoint is intentionally separate from product-image signing.
  void payload;

  const timestamp = Math.round(Date.now() / 1000);
  const { cloudinary, creds, folder: baseFolder } = requireCloudinaryClient();
  const folder = `${baseFolder}/vendor-logos/${payload.sub}`;

  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, creds.apiSecret);

  return Response.json({
    timestamp,
    signature,
    folder,
    cloudName: creds.cloudName,
    apiKey: creds.apiKey,
  });
}
