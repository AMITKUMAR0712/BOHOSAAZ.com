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
import { SITE } from "@/lib/seo/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),

  title: {
    default: "Bohosaaz | Online Gift Shop in Noida & Delhi NCR",
    template: "%s | Bohosaaz",
  },

  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
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

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "Bohosaaz | Online Gift Shop in Noida & Delhi NCR",
    description: SITE.description,
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    locale: SITE.locale,
    images: [
      {
        url: SITE.defaultOgImage,
        width: SITE.ogImageWidth,
        height: SITE.ogImageHeight,
        alt: "Bohosaaz online gift shop in Noida and Delhi NCR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bohosaaz | Online Gift Shop in Noida & Delhi NCR",
    description: SITE.description,
    images: [SITE.defaultOgImage],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}${SITE.defaultOgImage}`,
  sameAs: Object.values(SITE.social),
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: SITE.contact.email,
    availableLanguage: ["English", "Hindi"],
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: SITE.name,
  url: SITE.url,
  image: `${SITE.url}${SITE.defaultOgImage}`,
  description: SITE.description,
  areaServed: [...SITE.areasServed],
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
  name: SITE.name,
  url: SITE.url,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE.url}/en/shop?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-screen text-foreground antialiased">
        <Script id="bohosaaz-theme-init" strategy="beforeInteractive">
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

            <SiteHeader />

            <main className="site-content">{children}</main>

            <SiteFooter />
            <BackToTop />
            <WhatsAppFloat />
          </ToastProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
