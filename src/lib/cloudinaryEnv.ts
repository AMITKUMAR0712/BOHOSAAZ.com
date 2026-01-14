type CloudinaryCreds = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function nonEmpty(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0;
}

export function getCloudinaryCreds(): CloudinaryCreds | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (nonEmpty(cloudName) && nonEmpty(apiKey) && nonEmpty(apiSecret)) {
    return { cloudName: cloudName!.trim(), apiKey: apiKey!.trim(), apiSecret: apiSecret!.trim() };
  }

  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!nonEmpty(cloudinaryUrl)) return null;

  // CLOUDINARY_URL format: cloudinary://<api_key>:<api_secret>@<cloud_name>
  try {
    const url = new URL(cloudinaryUrl!);
    const parsedCloudName = url.hostname;
    const parsedApiKey = decodeURIComponent(url.username);
    const parsedApiSecret = decodeURIComponent(url.password);

    if (!nonEmpty(parsedCloudName) || !nonEmpty(parsedApiKey) || !nonEmpty(parsedApiSecret)) return null;

    return {
      cloudName: parsedCloudName.trim(),
      apiKey: parsedApiKey.trim(),
      apiSecret: parsedApiSecret.trim(),
    };
  } catch {
    return null;
  }
}
