import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/toast";
import SonnerToaster from "@/components/SonnerToaster";
import BackToTop from "@/components/BackToTop";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import ChatbotWidget from "@/components/ChatbotWidget";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Bohosaaz Marketplace",
    template: "%s • Bohosaaz",
  },
  description: "Multi-vendor ecommerce marketplace",
  openGraph: {
    title: "Bohosaaz Marketplace",
    description: "Multi-vendor ecommerce marketplace",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Script
          id="bohosaaz-theme-init"
          strategy="beforeInteractive"
        >{`(function(){try{var k='bohosaaz_theme';var v=localStorage.getItem(k);var isDark=(v!=='light');var r=document.documentElement;r.classList.toggle('dark',isDark);r.style.colorScheme=isDark?'dark':'light';}catch(e){}})();`}</Script>
        <ToastProvider>
          <SonnerToaster />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <BackToTop />
          <WhatsAppFloat />
          <ChatbotWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
