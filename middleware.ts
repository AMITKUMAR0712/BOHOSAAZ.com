import { NextRequest, NextResponse } from "next/server";

const LOCALES = new Set(["en", "hi"]);
const LANG_COOKIE = "bohosaaz_lang";

const PUBLIC_FILE = /\.[^/]+$/;

type JwtRole = "USER" | "VENDOR" | "ADMIN";

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return atob(normalized + pad);
}

function getJwtRoleFromToken(token: string): JwtRole | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const json = base64UrlDecode(parts[1] || "");
    const payload: any = JSON.parse(json);
    const role = payload?.role;

    return role === "ADMIN" || role === "VENDOR" || role === "USER" ? role : null;
  } catch {
    return null;
  }
}

function preferredLang(req: NextRequest) {
  const v = req.cookies.get(LANG_COOKIE)?.value;
  if (v && LOCALES.has(v)) return v;
  return "en";
}

function redirectToHome(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();

  const pathname = req.nextUrl.pathname;
  const seg = pathname.split("/").filter(Boolean);
  const maybeLang = seg[0];
  const langPrefix = maybeLang && LOCALES.has(maybeLang) ? `/${maybeLang}` : "";

  url.pathname = `${langPrefix}/login`;
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function stripLang(pathname: string) {
  const seg = pathname.split("/").filter(Boolean);
  const maybeLang = seg[0];

  if (maybeLang && LOCALES.has(maybeLang)) {
    return {
      lang: maybeLang,
      pathname: "/" + seg.slice(1).join("/"),
    };
  }

  return { lang: null as string | null, pathname };
}

function getTokenFromRequest(req: NextRequest) {
  const cookieToken = req.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next internals, API routes, static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Root → /en
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferredLang(req)}`;
    return NextResponse.redirect(url);
  }

  const stripped = stripLang(pathname);
  const p = stripped.pathname;

  // Remove language prefix for dashboards
  if (stripped.lang && (p.startsWith("/vendor") || p.startsWith("/account"))) {
    const url = req.nextUrl.clone();
    url.pathname = p;
    return NextResponse.redirect(url);
  }

  // Add language prefix for public routes
  if (!stripped.lang) {
    if (
      p === "/403" ||
      p.startsWith("/admin") ||
      p.startsWith("/vendor") ||
      p.startsWith("/account")
    ) {
      // allowed
    } else {
      const url = req.nextUrl.clone();
      url.pathname = `/${preferredLang(req)}${p}`;
      return NextResponse.redirect(url);
    }
  }

  const isAdmin = p.startsWith("/admin");
  const isVendor = p.startsWith("/vendor");
  const isAccount = p.startsWith("/account");

  if (!isAdmin && !isVendor && !isAccount) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);
  if (!token) return redirectToLogin(req);

  const role = getJwtRoleFromToken(token);
  if (!role) return redirectToLogin(req);

  // Role protection
  if (isAdmin && role !== "ADMIN") {
    return redirectToHome(req);
  }

  if (isVendor && role !== "VENDOR") {
    return redirectToHome(req);
  }

  if (isAccount && role !== "USER") {
    if (role === "VENDOR" && p.startsWith("/account/vendor-apply")) {
      return NextResponse.next();
    }
    return redirectToHome(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};