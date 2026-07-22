"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 60_000;
const WARMUP_MS = 15_000;

function isDocumentBusy() {
  const active = document.activeElement;
  if (!active) return false;

  const tag = active.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    active.hasAttribute("contenteditable")
  );
}

export default function GlobalAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let warmedUp = false;
    const warmupTimer = window.setTimeout(() => {
      warmedUp = true;
    }, WARMUP_MS);

    const refresh = () => {
      if (!warmedUp) return;
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
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearTimeout(warmupTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);

  return null;
}
