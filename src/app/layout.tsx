import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, Playfair_Display, Roboto_Mono } from "next/font/google";
import "./globals.css";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/toast";
import { CurrencyProvider } from "@/lib/currency-context";
import { requireUser } from "@/lib/auth";
import { SITE } from "@/lib/seo/config";

const SonnerToaster = dynamic(() => import("@/components/SonnerToaster"), { ssr: false });
const BackToTop = dynamic(() => import("@/components/BackToTop"), { ssr: false });
const WhatsAppFloat = dynamic(() => import("@/components/WhatsAppFloat"), { ssr: false });
const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), { ssr: false });
const GlobalAutoRefresh = dynamic(() => import("@/components/GlobalAutoRefresh"), { ssr: false });

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-roboto-mono",
  display: "swap",
  preload: false,
});

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
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${robotoMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('bohosaaz_theme');var d=v==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, localBusinessJsonLd, websiteJsonLd]),
          }}
        />
      </head>
      <body className="min-h-screen text-foreground antialiased">
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
