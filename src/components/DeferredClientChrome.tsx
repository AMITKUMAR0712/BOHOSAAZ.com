"use client";

import dynamic from "next/dynamic";

const SonnerToaster = dynamic(() => import("@/components/SonnerToaster"), { ssr: false });
const BackToTop = dynamic(() => import("@/components/BackToTop"), { ssr: false });
const WhatsAppFloat = dynamic(() => import("@/components/WhatsAppFloat"), { ssr: false });
const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), { ssr: false });
const GlobalAutoRefresh = dynamic(() => import("@/components/GlobalAutoRefresh"), { ssr: false });

/** Deferred client-only chrome — keeps root layout a Server Component. */
export default function DeferredClientChrome() {
  return (
    <>
      <SonnerToaster />
      <ScrollToTop />
      <GlobalAutoRefresh />
      <BackToTop />
      <WhatsAppFloat />
    </>
  );
}
