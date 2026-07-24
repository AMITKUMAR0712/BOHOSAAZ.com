import { z } from "zod";

/** Normalize CMS slug: trim, strip edge slashes, collapse repeats. */
export function normalizeCmsSlug(input: string) {
  return input
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/")
    .toLowerCase();
}

/**
 * Segments: lowercase letters, numbers, hyphen.
 * Nested paths allowed: about/team, help/shipping
 */
export const cmsSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(191)
  .transform(normalizeCmsSlug)
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value), {
    message: "Slug may only use a-z, 0-9, hyphens, and / (e.g. about or about/team)",
  });

export function publicCmsPath(lang: string, slug: string) {
  const s = normalizeCmsSlug(slug);
  if (!s) return `/${lang}`;
  const path = s.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `/${lang}/${path}`;
}
