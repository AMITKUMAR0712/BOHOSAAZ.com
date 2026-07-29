import { SITE } from "@/lib/seo/config";
import { absoluteUrl } from "@/lib/seo/assert";

type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdValue =
  | JsonLdPrimitive
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined };

export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

function stripUndefined(value: JsonLdValue | undefined): JsonLdValue | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefined(item))
      .filter((item): item is JsonLdValue => item !== undefined);
  }
  if (value && typeof value === "object") {
    const out: JsonLdObject = {};
    for (const [key, nested] of Object.entries(value)) {
      const cleaned = stripUndefined(nested);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
}

export function jsonLdScript(data: JsonLdObject | JsonLdObject[]): string {
  const cleaned = stripUndefined(data as JsonLdValue);
  return JSON.stringify(cleaned);
}

export function faqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
  pageUrl: string
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

type ProductOfferInput = {
  name: string;
  description: string;
  slug: string;
  sku?: string | null;
  brandName?: string | null;
  imageUrls: string[];
  currency: "INR" | "USD" | string;
  price: number;
  salePrice?: number | null;
  mrp?: number | null;
  stock?: number | null;
  categoryName?: string | null;
};

function toAbsoluteImage(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return absoluteUrl(url.startsWith("/") ? url : `/${url}`);
}

export function productJsonLd(input: ProductOfferInput): JsonLdObject {
  const offerPrice = Number(
    input.salePrice != null && input.salePrice > 0 ? input.salePrice : input.price
  );
  const inStock = (input.stock ?? 0) > 0;
  const images = input.imageUrls.filter(Boolean).map(toAbsoluteImage);

  const product: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: absoluteUrl(`/en/p/${input.slug}`),
    image: images.length === 1 ? images[0] : images,
    sku: input.sku || undefined,
    brand: input.brandName
      ? { "@type": "Brand", name: input.brandName }
      : { "@type": "Brand", name: SITE.name },
    category: input.categoryName || undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/en/p/${input.slug}`),
      priceCurrency: input.currency === "USD" ? "USD" : "INR",
      price: offerPrice,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE.name,
      },
    },
  };

  if (input.mrp != null && input.mrp > offerPrice) {
    (product.offers as JsonLdObject).priceValidUntil = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30
    )
      .toISOString()
      .slice(0, 10);
  }

  return product;
}

type BlogPostingInput = {
  title: string;
  description: string;
  slug: string;
  body?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
};

export function blogPostingJsonLd(input: BlogPostingInput): JsonLdObject {
  const url = absoluteUrl(`/en/blog/${input.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    image: input.coverImageUrl ? toAbsoluteImage(input.coverImageUrl) : absoluteUrl(SITE.defaultOgImage),
    datePublished: input.publishedAt?.toISOString(),
    dateModified: (input.updatedAt || input.publishedAt || new Date()).toISOString(),
    author: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon.png"),
      },
    },
  };
}

export function webPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
    },
    about: {
      "@type": "Organization",
      name: SITE.name,
    },
  };
}

export function contactPageJsonLd(): JsonLdObject {
  const whatsappDigits = SITE.contact.whatsapp.replace(/\D/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SITE.name}`,
    url: absoluteUrl("/en/contact"),
    description: `Contact ${SITE.name} for gift orders, delivery questions and seller support in ${SITE.areasServed.join(", ")}.`,
    mainEntity: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      email: SITE.contact.email,
      telephone: SITE.contact.whatsapp,
      sameAs: Object.values(SITE.social),
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: SITE.contact.email,
          telephone: SITE.contact.whatsapp,
          availableLanguage: ["English", "Hindi"],
          areaServed: [...SITE.areasServed],
        },
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          url: `https://wa.me/${whatsappDigits}`,
          availableLanguage: ["English", "Hindi"],
        },
      ],
    },
  };
}

export function itemListJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: Array<{ name: string; path: string; image?: string | null }>;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.items.slice(0, 24).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(item.path),
        name: item.name,
        image: item.image ? toAbsoluteImage(item.image) : undefined,
      })),
    },
  };
}
