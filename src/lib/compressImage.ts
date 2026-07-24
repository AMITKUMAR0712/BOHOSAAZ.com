/**
 * Compresses oversized image files in the browser before upload.
 * Keeps files under typical reverse-proxy / API body limits.
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxEdge?: number; maxBytes?: number; quality?: number },
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 1800;
  const maxBytes = options?.maxBytes ?? 3.5 * 1024 * 1024;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size <= maxBytes && file.type === "image/webp") return file;

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const preferWebp = typeof canvas.toBlob === "function";
    const blob: Blob | null = await new Promise((resolve) => {
      if (!preferWebp) {
        resolve(null);
        return;
      }
      canvas.toBlob((b) => resolve(b), "image/webp", quality);
    });

    const outBlob =
      blob ??
      (await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
      }));

    if (!outBlob || outBlob.size >= file.size) return file;

    const ext = outBlob.type === "image/webp" ? ".webp" : ".jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([outBlob], `${base}${ext}`, {
      type: outBlob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
