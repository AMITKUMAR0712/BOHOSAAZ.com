/**
 * Canonical site config for SEO.
 * Contact NAP (phone, street, postal, geo) intentionally omitted until
 * confirmed — do not invent values for LocalBusiness schema.
 */
export const SITE = {
  name: "Bohosaaz",
  url: "https://www.bohosaaz.com",
  locale: "en_IN",
  lang: "en-IN",
  defaultLocalePath: "en",
  currency: "INR",
  tagline: "Meaningful gifting",
  description:
    "Bohosaaz is a premium online gifting marketplace for gift products in Noida, Greater Noida, New Delhi and Delhi NCR. Shop curated birthday gifts, anniversary gifts, corporate gifts, festival gifts, home decor, barware, luxury hampers and personalized gift ideas.",
  social: {
    instagram: "https://www.instagram.com/bohosaaz",
    facebook: "https://www.facebook.com/bohosaaz",
    youtube: "https://www.youtube.com/@bohosaaz",
  },
  contact: {
    whatsapp: "+919992196879",
    email: "care@bohosaaz.com",
    // phone, street address, postalCode, geo — confirm before LocalBusiness schema
  },
  areasServed: [
    "Noida",
    "Greater Noida",
    "New Delhi",
    "Delhi NCR",
    "Ghaziabad",
    "Gurugram",
  ],
  defaultOgImage: "/og-default.jpg",
  ogImageWidth: 1200,
  ogImageHeight: 630,
} as const;

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
export const TITLE_TEMPLATE_SUFFIX = " | Bohosaaz";
