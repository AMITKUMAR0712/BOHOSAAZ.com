import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/toast";
import SonnerToaster from "@/components/SonnerToaster";
import BackToTop from "@/components/BackToTop";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import ScrollToTop from "@/components/ScrollToTop";
import GlobalAutoRefresh from "@/components/GlobalAutoRefresh";
import { CurrencyProvider } from "@/lib/currency-context";
import { requireUser } from "@/lib/auth";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const seoKeywords = [
  "gift products in Noida",
  "gift products in Greater Noida",
  "gift products in New Delhi",
  "gift products in Delhi NCR",
  "online gifts in Noida",
  "online gifts in Greater Noida",
  "online gifts in New Delhi NCR",
  "birthday gifts in Noida",
  "anniversary gifts in Delhi NCR",
  "corporate gifts in Noida",
  "premium gifts in Delhi NCR",
  "personalized gifts in Noida",
  "handmade gifts in India",
  "festival gifts online",
  "Diwali gifts Delhi NCR",
  "wedding gifts Noida",
  "unique gifts for men",
  "unique gifts for women",
  "luxury gift hampers",
  "return gifts online",
  "Bohosaaz gifts",
];

const siteDescription =
  "Bohosaaz is a premium online gifting marketplace for gift products in Noida, Greater Noida, New Delhi and Delhi NCR. Shop curated birthday gifts, anniversary gifts, corporate gifts, festival gifts, home decor, barware, luxury hampers and personalized gift ideas.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Bohosaaz | Gift Products in Noida, Greater Noida & Delhi NCR",
    template: "%s • Bohosaaz",
  },

  description: siteDescription,
  applicationName: "Bohosaaz",
  authors: [{ name: "Bohosaaz" }],
  creator: "Bohosaaz",
  publisher: "Bohosaaz",
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  category: "Online gifting marketplace",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // Browser tab logo / favicon
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // Social sharing preview
  openGraph: {
    title: "Bohosaaz | Gift Products in Noida, Greater Noida & Delhi NCR",
    description: siteDescription,
    type: "website",
    url: siteUrl,
    siteName: "Bohosaaz",
    locale: "en_IN",
    images: [
      {
        url: "/logo copy.jpeg",
        width: 512,
        height: 512,
        alt: "Bohosaaz gift products in Delhi NCR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bohosaaz | Gift Products in Noida & Delhi NCR",
    description: siteDescription,
    images: ["/logo copy.jpeg"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Bohosaaz",
  url: siteUrl,
  logo: `${siteUrl}/logo%20copy.jpeg`,
  sameAs: [siteUrl],
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "Bohosaaz",
  url: siteUrl,
  image: `${siteUrl}/logo%20copy.jpeg`,
  description: siteDescription,
  areaServed: [
    "Noida",
    "Greater Noida",
    "New Delhi",
    "Delhi NCR",
    "Ghaziabad",
    "Gurugram",
    "Faridabad",
  ],
  keywords: seoKeywords.join(", "),
  priceRange: "₹₹",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Noida",
    addressRegion: "Uttar Pradesh",
    addressCountry: "IN",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Bohosaaz",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/en/shop?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve current user server-side (reads auth cookie)
  const user = await requireUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen text-foreground antialiased">
        
        <Script
          id="bohosaaz-theme-init"
          strategy="beforeInteractive"
        >
          {`
            (function () {
              try {
                var k = 'bohosaaz_theme';
                var v = localStorage.getItem(k);
                var isDark = (v === 'dark');

                var r = document.documentElement;
                r.classList.toggle('dark', isDark);
                r.style.colorScheme = isDark ? 'dark' : 'light';
              } catch (e) {}
            })();
          `}
        </Script>
        <Script
          id="bohosaaz-seo-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationJsonLd,
              localBusinessJsonLd,
              websiteJsonLd,
            ]),
          }}
        />

        <CurrencyProvider userId={user?.id}>
          <ToastProvider>
            <SonnerToaster />
            <ScrollToTop />
            <GlobalAutoRefresh />

            {/* Header */}
            <SiteHeader />

            {/* Main Content */}
            <main className="site-content">{children}</main>

            {/* Footer + Utilities */}
            <SiteFooter />
            <BackToTop />
            <WhatsAppFloat />

          </ToastProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}