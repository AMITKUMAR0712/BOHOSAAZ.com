import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/admin", "/vendor", "/account"] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
