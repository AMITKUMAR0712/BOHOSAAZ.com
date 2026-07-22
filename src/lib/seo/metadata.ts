import type { Metadata } from "next";
import { SITE } from "@/lib/seo/config";
import {
  absoluteUrl,
  assertSeoLimits,
  fitDescription,
  fitTitleSegment,
  ogImageUrl,
} from "@/lib/seo/assert";

export type BuildMetadataInput = {
  /** Page title WITHOUT brand name — template appends `| Bohosaaz`. */
  title: string;
  description: string;
  /** Path relative to site root, e.g. `/en/shop` or `/en/p/slug`. */
  path: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  nofollow?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  /** When true, use dynamic /api/og with the title. */
  dynamicOg?: boolean;
  ogType?: "product" | "blog" | "page";
};

/**
 * Central metadata builder. Every storefront page should use this helper.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const title = fitTitleSegment(input.title);
  const description = fitDescription(input.description);
  assertSeoLimits(title, description);

  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const canonicalPath = path === "" ? "/" : path;
  const pageUrl = absoluteUrl(canonicalPath);

  const image =
    input.image ||
    (input.dynamicOg ? ogImageUrl(title, input.ogType) : SITE.defaultOgImage);

  const index = !input.noindex;
  const follow = !input.nofollow;

  const ogType =
    input.type === "article"
      ? "article"
      : input.type === "product"
        ? "website"
        : "website";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "en-IN": canonicalPath,
        "x-default": canonicalPath,
      },
    },
    robots: {
      index,
      follow,
      googleBot: {
        index,
        follow,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${title} | ${SITE.name}`,
      description,
      type: ogType,
      url: pageUrl,
      siteName: SITE.name,
      locale: SITE.locale,
      images: [
        {
          url: image,
          width: SITE.ogImageWidth,
          height: SITE.ogImageHeight,
          alt: title,
        },
      ],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE.name}`,
      description,
      images: [image],
    },
  };
}
