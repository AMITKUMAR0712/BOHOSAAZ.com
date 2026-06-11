"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 8000;

function isDocumentBusy() {
  const active = document.activeElement;
  if (!active) return false;

  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || active.hasAttribute("contenteditable");
}

export default function GlobalAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;

      window.dispatchEvent(new CustomEvent("bohosaaz-live-refresh"));

      if (isDocumentBusy()) return;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      startTransition(() => {
        router.refresh();
        requestAnimationFrame(() => {
          window.scrollTo({ left: scrollX, top: scrollY, behavior: "auto" });
        });
      });
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);

  return null;
}
