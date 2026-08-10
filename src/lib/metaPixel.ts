declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Fires a Meta Pixel (fbq) browser event. No-ops if the pixel script hasn't loaded (blocked, still loading, etc). */
export function trackPixel(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) {
    window.fbq("track", event, params ?? {}, { eventID: eventId });
  } else {
    window.fbq("track", event, params ?? {});
  }
}

/** Reads the _fbp/_fbc cookies fbevents.js sets so the browser event_id/cookies can be forwarded to the server for CAPI dedup and match quality. */
export function getFbCookies(): { fbp: string | null; fbc: string | null } {
  if (typeof document === "undefined") return { fbp: null, fbc: null };
  const read = (name: string) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };
  return { fbp: read("_fbp"), fbc: read("_fbc") };
}
