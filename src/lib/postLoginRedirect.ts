import { isLocale } from "@/lib/i18n";

type MeResponse = {
  user?: {
    role?: "USER" | "VENDOR" | "ADMIN";
    vendor?: { status?: string | null } | null;
  };
} | null;

function roleHome(role: string | undefined, langPrefix: string) {
  if (role === "ADMIN") return `${langPrefix}/admin/dashboard`;
  if (role === "VENDOR") return `${langPrefix}/vendor/dashboard`;
  return `${langPrefix}/account`;
}

function isRoleAllowedNext(role: string | undefined, nextPath: string) {
  // If we can't detect role, only allow storefront destinations.
  if (!role) return !nextPath.startsWith("/admin") && !nextPath.startsWith("/vendor") && !nextPath.startsWith("/account");

  if (role === "ADMIN") return nextPath.startsWith("/admin");
  if (role === "VENDOR") return nextPath.startsWith("/vendor") || nextPath.startsWith("/account/vendor-apply");
  // USER
  return nextPath.startsWith("/account") || nextPath === "/";
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
  const vendorStatus = me?.user?.vendor?.status || null;

  const normalizedRoleHome = (() => {
    if (role === "VENDOR" && vendorStatus !== "APPROVED") return `${lp}/account/vendor-apply`;
    return roleHome(role, lp);
  })();

  if (nextPath) {
    const normalized = normalizeNext(nextPath, lang);
    if (normalized) {
      const stripped = normalized.startsWith("/en/") || normalized.startsWith("/hi/") ? "/" + normalized.split("/").slice(2).join("/") : normalized;
      if (isRoleAllowedNext(role, stripped)) return normalized;
    }
  }

  // Always land on the correct role dashboard.
  return normalizedRoleHome;
}
