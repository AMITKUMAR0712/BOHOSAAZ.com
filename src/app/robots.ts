import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/config";

const privatePaths = [
  "/admin",
  "/vendor",
  "/account",
  "/api",
  "/checkout",
  "/login",
  "/register",
  "/cart",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      // Allow major AI / answer-engine crawlers to read public storefront content (GEO / LLMO)
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "Anthropic-AI",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
