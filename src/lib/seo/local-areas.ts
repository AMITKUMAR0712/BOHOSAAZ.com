import { SITE } from "@/lib/seo/config";

export type LocalGiftArea = {
  slug: string;
  name: string;
  regionLabel: string;
  titleSegment: string;
  description: string;
  headline: string;
  intro: string;
  whyTitle: string;
  whyBody: string;
  bullets: string[];
  faqs: Array<{ question: string; answer: string }>;
};

export const LOCAL_GIFT_AREAS: LocalGiftArea[] = [
  {
    slug: "noida",
    name: "Noida",
    regionLabel: "Noida & Greater Noida",
    titleSegment: "Gifts in Noida — Online Gift Shop",
    description:
      "Buy curated gifts online in Noida & Greater Noida. Birthday, anniversary, corporate and festival gifts with delivery across Delhi NCR from Bohosaaz.",
    headline: "Online gift shop in Noida",
    intro:
      "Bohosaaz is a premium online gifting store for Noida and Greater Noida. Shop curated birthday gifts, anniversary gifts, corporate gifts, festival hampers, home decor and barware — with delivery across Delhi NCR.",
    whyTitle: "Why shop gifts with Bohosaaz in Noida",
    whyBody: `${SITE.name} focuses on meaningful, curated gifting — birthday surprises, anniversary presents, corporate hampers and festival gifts — for customers across Noida, Greater Noida and the wider Delhi NCR.`,
    bullets: [
      "Curated gift catalog for personal and corporate occasions",
      "Serving Noida, Greater Noida and nearby Delhi NCR cities",
      `Order tracking, returns guidance and support at ${SITE.contact.email}`,
    ],
    faqs: [
      {
        question: "Where can I buy gifts online in Noida?",
        answer:
          "Bohosaaz is an online gift shop serving Noida and Greater Noida. Browse curated gifts on bohosaaz.com, filter by occasion or budget, and order for delivery across Delhi NCR.",
      },
      {
        question: "Does Bohosaaz deliver gifts in Greater Noida?",
        answer:
          "Yes. Bohosaaz serves Greater Noida along with Noida, New Delhi, Ghaziabad and Gurugram. Exact delivery timelines depend on the product and your checkout pincode.",
      },
      {
        question: "What gift categories are popular in Noida?",
        answer:
          "Popular choices include birthday gifts, anniversary gifts, corporate hampers, festive gifts, home decor and barware. Use Shop filters to match occasion, recipient and budget.",
      },
    ],
  },
  {
    slug: "delhi-ncr",
    name: "Delhi NCR",
    regionLabel: "New Delhi & Delhi NCR",
    titleSegment: "Gifts in Delhi NCR — Online Gift Shop",
    description:
      "Buy curated gifts online in New Delhi & Delhi NCR. Birthday, anniversary, corporate and festival gifts from Bohosaaz with Noida-based gifting expertise.",
    headline: "Online gift shop in Delhi NCR",
    intro:
      "Bohosaaz is a premium online gifting marketplace for New Delhi and Delhi NCR — including Noida, Greater Noida, Ghaziabad and Gurugram. Discover birthday gifts, anniversary gifts, corporate gifts and festival hampers online.",
    whyTitle: "Gifting across Delhi NCR with Bohosaaz",
    whyBody: `From New Delhi offices to Noida homes, ${SITE.name} helps you send meaningful gifts without generic marketplace clutter. Areas commonly served include ${SITE.areasServed.join(", ")}.`,
    bullets: [
      "One catalog for personal, corporate and festival gifting across NCR",
      "Clear product pages with packaging, personalization and return details",
      `Support via ${SITE.contact.email} or WhatsApp ${SITE.contact.whatsapp}`,
    ],
    faqs: [
      {
        question: "Is Bohosaaz a gift shop for Delhi NCR?",
        answer:
          "Yes. Bohosaaz is an online gift shop serving New Delhi and Delhi NCR, with delivery coverage that includes Noida, Greater Noida, Ghaziabad and Gurugram depending on product and pincode.",
      },
      {
        question: "What can I buy for corporate gifting in Delhi NCR?",
        answer:
          "Browse corporate-friendly gifts and festival hampers on Bohosaaz, or email care@bohosaaz.com for bulk and custom corporate gifting needs across Delhi NCR.",
      },
      {
        question: "How do I order gifts for someone in New Delhi?",
        answer:
          "Shop on bohosaaz.com, choose the gift, enter the recipient address in New Delhi or elsewhere in Delhi NCR at checkout, and track your order from My Account after purchase.",
      },
    ],
  },
  {
    slug: "greater-noida",
    name: "Greater Noida",
    regionLabel: "Greater Noida",
    titleSegment: "Gifts in Greater Noida — Online Gift Shop",
    description:
      "Order curated gifts online for Greater Noida. Birthday, anniversary, corporate and festival gifts from Bohosaaz with Delhi NCR delivery support.",
    headline: "Online gift shop for Greater Noida",
    intro:
      "Looking for gifts in Greater Noida? Bohosaaz curates premium birthday gifts, anniversary gifts, corporate hampers and festive presents for homes and offices across Greater Noida and nearby Noida.",
    whyTitle: "Curated gifting for Greater Noida",
    whyBody:
      "Greater Noida shoppers get the same Bohosaaz curation — thoughtful products, clear pricing and support — with delivery based on seller location and your pincode at checkout.",
    bullets: [
      "Gift filters by occasion, budget and category",
      "Ideal for residential societies, campuses and office gifting",
      "Linked local guides for Noida and wider Delhi NCR",
    ],
    faqs: [
      {
        question: "Can I get gift delivery in Greater Noida from Bohosaaz?",
        answer:
          "Yes. Bohosaaz serves Greater Noida as part of its Delhi NCR coverage. Delivery timing depends on the product, seller and the pincode you enter at checkout.",
      },
      {
        question: "What are good corporate gifts for Greater Noida offices?",
        answer:
          "Festival hampers, barware, home decor and premium curated sets work well for corporate gifting. Browse Shop filters or contact care@bohosaaz.com for bulk needs.",
      },
      {
        question: "Is Bohosaaz only for Noida or also Greater Noida?",
        answer:
          "Bohosaaz serves both Noida and Greater Noida, plus New Delhi, Ghaziabad and Gurugram within Delhi NCR.",
      },
    ],
  },
  {
    slug: "gurugram",
    name: "Gurugram",
    regionLabel: "Gurugram (Gurgaon)",
    titleSegment: "Gifts in Gurugram — Online Gift Shop",
    description:
      "Shop curated gifts online for Gurugram (Gurgaon). Birthday, anniversary, corporate and festival gifts from Bohosaaz across Delhi NCR.",
    headline: "Online gift shop for Gurugram",
    intro:
      "Bohosaaz helps you send meaningful gifts in Gurugram — from birthday surprises and anniversary presents to corporate gifting for Gurgaon offices — through a curated online catalog.",
    whyTitle: "Why Gurugram customers choose Bohosaaz",
    whyBody:
      "Gurugram gifting often needs speed, polish and corporate-ready options. Bohosaaz focuses on curated products with clear details so you can shortlist faster for personal and workplace occasions.",
    bullets: [
      "Corporate and personal gifting in one curated catalog",
      "Useful for Sector offices, residences and client gifts",
      "Part of Bohosaaz Delhi NCR service coverage",
    ],
    faqs: [
      {
        question: "Does Bohosaaz deliver gifts in Gurugram / Gurgaon?",
        answer:
          "Yes. Gurugram is part of Bohosaaz Delhi NCR coverage. Availability and timelines depend on product stock, seller location and your checkout pincode.",
      },
      {
        question: "Can I order corporate gifts for Gurugram teams?",
        answer:
          "Yes. Browse corporate-friendly gifts and hampers online, or email care@bohosaaz.com for bulk or custom corporate gifting in Gurugram.",
      },
      {
        question: "How is Bohosaaz different from generic marketplaces in Gurugram?",
        answer:
          "Bohosaaz is a curated gifting marketplace focused on meaningful presents — not an unfiltered catalog dump — with local NCR-oriented product discovery.",
      },
    ],
  },
  {
    slug: "ghaziabad",
    name: "Ghaziabad",
    regionLabel: "Ghaziabad",
    titleSegment: "Gifts in Ghaziabad — Online Gift Shop",
    description:
      "Buy curated gifts online for Ghaziabad. Birthday, anniversary, corporate and festival gifts from Bohosaaz with Delhi NCR delivery support.",
    headline: "Online gift shop for Ghaziabad",
    intro:
      "Send curated gifts in Ghaziabad with Bohosaaz — birthday gifts, anniversary gifts, festival hampers and corporate presents selected for meaningful occasions across Delhi NCR.",
    whyTitle: "Gifting in Ghaziabad with Bohosaaz",
    whyBody:
      "Whether you are gifting family in Ghaziabad or sending a corporate thank-you, Bohosaaz offers a curated shortlist with transparent product details and support.",
    bullets: [
      "Occasion and budget filters to shortlist faster",
      "Coverage across Ghaziabad and neighbouring NCR cities",
      `Customer support at ${SITE.contact.email}`,
    ],
    faqs: [
      {
        question: "Can Bohosaaz deliver gifts to Ghaziabad?",
        answer:
          "Yes. Ghaziabad is included in Bohosaaz Delhi NCR service areas. Confirm delivery options for your pincode during checkout.",
      },
      {
        question: "What gifts work well for families in Ghaziabad?",
        answer:
          "Birthday gifts, anniversary presents, home decor and festival hampers are popular. Use Shop filters by occasion and budget to find a fit.",
      },
      {
        question: "How do I track a gift order to Ghaziabad?",
        answer:
          "After login, open My Account → Track Orders, or contact care@bohosaaz.com with your order number.",
      },
    ],
  },
  {
    slug: "new-delhi",
    name: "New Delhi",
    regionLabel: "New Delhi",
    titleSegment: "Gifts in New Delhi — Online Gift Shop",
    description:
      "Order curated gifts online for New Delhi. Birthday, anniversary, corporate and festival gifts from Bohosaaz across Delhi NCR.",
    headline: "Online gift shop for New Delhi",
    intro:
      "Bohosaaz is a premium online gift shop for New Delhi — curated birthday gifts, anniversary gifts, corporate gifts and festival hampers for homes and workplaces across the capital and Delhi NCR.",
    whyTitle: "Curated gifting for New Delhi",
    whyBody:
      "New Delhi gifting spans personal celebrations and formal corporate moments. Bohosaaz keeps the catalog curated so you can choose with confidence and clear product information.",
    bullets: [
      "Strong fit for birthdays, anniversaries and client gifts",
      "Connected local pages for Noida, Gurugram and wider NCR",
      "Support in English and Hindi via email / WhatsApp",
    ],
    faqs: [
      {
        question: "Is Bohosaaz available for gift delivery in New Delhi?",
        answer:
          "Yes. New Delhi is part of Bohosaaz Delhi NCR coverage. Delivery depends on the product, seller and the recipient pincode at checkout.",
      },
      {
        question: "Where should I start for corporate gifts in New Delhi?",
        answer:
          "Start on the Shop page with corporate-friendly categories and hampers, or email care@bohosaaz.com for bulk requirements.",
      },
      {
        question: "Does Bohosaaz only sell in Noida or also New Delhi?",
        answer:
          "Bohosaaz is based around Noida gifting expertise but serves New Delhi and the wider Delhi NCR online.",
      },
    ],
  },
];

export function getLocalGiftArea(slug: string): LocalGiftArea | undefined {
  return LOCAL_GIFT_AREAS.find((area) => area.slug === slug);
}

export function localGiftPath(slug: string, lang = "en"): string {
  return `/${lang}/gifts-in-${slug}`;
}
