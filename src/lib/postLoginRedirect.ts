import { isLocale } from "@/lib/i18n";

type MeResponse = {
  user?: {
    role?: "USER" | "VENDOR" | "ADMIN";
    vendor?: { status?: string | null } | null;
  };
} | null;

function roleHome(role: string | undefined, langPrefix: string, vendorStatus?: string | null) {
  if (role === "ADMIN") return `${langPrefix}/admin/dashboard`;
  if (role === "VENDOR") return vendorStatus === "APPROVED" ? `${langPrefix}/vendor/dashboard` : `${langPrefix}/seller`;
  if (role === "USER") return langPrefix;
  return langPrefix;
}

function isRoleAllowedNext(role: string | undefined, nextPath: string) {
  // If we can't detect role, only allow storefront destinations.
  if (!role) return !nextPath.startsWith("/admin") && !nextPath.startsWith("/vendor") && !nextPath.startsWith("/account");

  if (role === "ADMIN") return nextPath.startsWith("/admin");
  if (role === "VENDOR") return (
    nextPath.startsWith("/vendor") ||
    nextPath.startsWith("/account/vendor-apply") ||
    nextPath.startsWith("/account/vendor-status")
  );
  // USER
  const isStorefront =
    nextPath === "/" ||
    nextPath.startsWith("/p/") ||
    nextPath.startsWith("/c/") ||
    nextPath.startsWith("/cart") ||
    nextPath.startsWith("/checkout") ||
    nextPath.startsWith("/seller");

  return isStorefront;
}

function detectLangFromPathname(pathname: string) {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg && isLocale(seg) ? seg : "en";
}

function isSafeInternalPath(path: string) {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/_next")) return false;
  return true;
}

function normalizeNext(nextPath: string, lang: string) {
  if (!isSafeInternalPath(nextPath)) return null;

  // Already lang-scoped
  if (nextPath.startsWith("/en/") || nextPath === "/en") return nextPath;
  if (nextPath.startsWith("/hi/") || nextPath === "/hi") return nextPath;

  const lp = `/${lang}`;

  // Promote known top-level areas into lang namespace
  const known = [
    "/admin",
    "/vendor",
    "/account",
    "/cart",
    "/checkout",
    "/login",
    "/register",
    "/seller",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    "/p/",
    "/order/",
  ];

  for (const p of known) {
    if (p.endsWith("/") ? nextPath.startsWith(p) : nextPath === p || nextPath.startsWith(p + "/")) {
      return `${lp}${nextPath}`;
    }
  }

  // Otherwise leave it as-is (still internal)
  return nextPath;
}

export async function resolvePostLoginRedirect(opts?: { next?: string | null }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const lang = detectLangFromPathname(pathname);
  const lp = `/${lang}`;

  const nextPath = opts?.next ? String(opts.next) : "";

  let me: MeResponse = null;
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) me = (await res.json()) as MeResponse;
  } catch {
    // ignore
  }

  const role = me?.user?.role;
  const normalizedRoleHome = roleHome(role, lp, me?.user?.vendor?.status);

  if (nextPath) {
    const normalized = normalizeNext(nextPath, lang);
    if (normalized) {
      const stripped = normalized.startsWith("/en/") || normalized.startsWith("/hi/") ? "/" + normalized.split("/").slice(2).join("/") : normalized;
      if (isRoleAllowedNext(role, stripped)) return normalized;
    }
  }

  // Default to storefront home when no valid `next` param is provided.
  return normalizedRoleHome;
}
