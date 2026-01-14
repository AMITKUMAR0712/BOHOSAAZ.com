import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const LOCALES = new Set(["en", "hi"]);
const LANG_COOKIE = "bohosaaz_lang";

const PUBLIC_FILE = /\.[^/]+$/;

function preferredLang(req: NextRequest) {
  const v = req.cookies.get(LANG_COOKIE)?.value;
  if (v && LOCALES.has(v)) return v;
  return "en";
}

function redirectTo403(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/403";
  url.search = "";
  return NextResponse.redirect(url);
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

  // Skip Next internals, API routes, and direct public file requests.
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

  // Production canonicalization: HTTPS + www
  if (process.env.NODE_ENV === "production") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        const desired = new URL(appUrl);
        const desiredHost = desired.host;
        const host = req.headers.get("host") || req.nextUrl.host;
        const xfProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();

        const wantWww = desiredHost.startsWith("www.");
        const bareHost = wantWww ? desiredHost.slice(4) : desiredHost;

        // Redirect non-www -> www when the app URL is www.
        if (wantWww && host === bareHost) {
          const url = req.nextUrl.clone();
          url.protocol = "https:";
          url.host = desiredHost;
          return NextResponse.redirect(url, 308);
        }

        // Redirect http -> https when behind a proxy that sets x-forwarded-proto.
        if (xfProto && xfProto !== "https") {
          const url = req.nextUrl.clone();
          url.protocol = "https:";
          url.host = host;
          return NextResponse.redirect(url, 308);
        }
      } catch {
        // ignore invalid NEXT_PUBLIC_APP_URL
      }
    }
  }

  // Root must go to /en
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferredLang(req)}`;
    return NextResponse.redirect(url);
  }

  const stripped = stripLang(pathname);
  const p = stripped.pathname;

  // Canonicalize some dashboard URLs to non-localized routes.
  // Admin is intentionally kept localized (/{lang}/admin/*) to match the original admin panel.
  if (stripped.lang && (p.startsWith("/vendor") || p.startsWith("/account"))) {
    const url = req.nextUrl.clone();
    url.pathname = p;
    return NextResponse.redirect(url);
  }
  // Locale comes from path when present.
  // Keep dashboards non-localized by design (/admin, /vendor), while still normalizing
  // public storefront routes into /{lang}/* so the app doesn't treat the first segment as [lang].
  if (!stripped.lang) {
    // Allow non-localized utility + dashboards.
    if (p === "/403" || p.startsWith("/admin") || p.startsWith("/vendor") || p.startsWith("/account")) {
      // Continue into RBAC checks below when needed.
    } else {
      const url = req.nextUrl.clone();
      url.pathname = `/${preferredLang(req)}${p}`;
      return NextResponse.redirect(url);
    }
  }

  const isAdmin = p.startsWith("/admin");
  const isVendor = p.startsWith("/vendor");
  const isAccount = p.startsWith("/account");

  if (!isAdmin && !isVendor && !isAccount) return NextResponse.next();

  const token = getTokenFromRequest(req);
  if (!token) return redirectToLogin(req);

  try {
    const payload = verifyToken(token);

    // Strict dashboard isolation: never allow a role into another dashboard.
    if (isAdmin && payload.role !== "ADMIN") {
      return redirectToHome(req);
    }

    if (isVendor && payload.role !== "VENDOR") {
      return redirectToHome(req);
    }

    if (isAccount && payload.role !== "USER") {
      // Allow vendors to access the vendor application flow inside account.
      if (payload.role === "VENDOR" && p.startsWith("/account/vendor-apply")) {
        return NextResponse.next();
      }
      return redirectToHome(req);
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

export const config = {
  matcher: [
    // Run for everything except Next internals + API + common public files.
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
