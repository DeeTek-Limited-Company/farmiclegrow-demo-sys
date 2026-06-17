import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, type AppRole } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { getWriteRateLimitPolicy, rateLimiter } from "@/lib/security/rate-limit";

const roleRouteMap: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/super-admin", roles: ["super_admin"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/agronomist", roles: ["admin", "agronomist"] },
  { prefix: "/ops", roles: ["admin", "ops"] },
  { prefix: "/buyer", roles: ["admin", "buyer"] },
  { prefix: "/farmer", roles: ["admin", "farmer"] },
];

const PUBLIC_ROUTES = ["/login", "/", "/buyer/signup"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1";

  // 1. Handle Public Routes
  const normalizedPathname = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  
  if (PUBLIC_ROUTES.some(route => normalizedPathname === route || normalizedPathname.startsWith(route + "/"))) {
    const response = NextResponse.next();
    // Ensure CSRF token is present even on public pages
    if (!request.cookies.has(CSRF_COOKIE_NAME)) {
      const token = crypto.randomUUID();
      response.cookies.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  }

  // 2. Super Admin Protection
  if (pathname.startsWith("/super-admin")) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const cookieOrgSlug = request.cookies.get("org_slug")?.value;
      const loginUrl = new URL(cookieOrgSlug ? `/org/${cookieOrgSlug}` : "/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const payload = await verifySessionToken(token);
      if (!payload.roles.includes("super_admin")) {
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
    } catch {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Organization Route Protection
  if (pathname.startsWith("/org/")) {
    const parts = pathname.split("/").filter(Boolean);
    const orgSlug = parts[1];
    const innerParts = parts.slice(2);
    const innerPathname = `/${innerParts.join("/")}`;

    if (innerParts.length === 0) {
      const response = NextResponse.next();
      response.cookies.set("org_slug", orgSlug, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      return response;
    }

    const roleRule = roleRouteMap.find((rule) => innerPathname.startsWith(rule.prefix));
    if (roleRule) {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      if (!token) {
        const loginUrl = new URL(`/org/${orgSlug}`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      try {
        const payload = await verifySessionToken(token);
        if (payload.organizationStatus !== "ACTIVE" && payload.organizationStatus !== "TRIAL") {
          return NextResponse.redirect(new URL("/forbidden?reason=org_inactive", request.url));
        }
        if (!payload.roles.some((role) => roleRule.roles.includes(role)) || payload.organizationSlug !== orgSlug) {
          return NextResponse.redirect(new URL("/forbidden", request.url));
        }
      } catch {
        return NextResponse.redirect(new URL(`/org/${orgSlug}`, request.url));
      }
    }
    return NextResponse.next();
  }

  // 3.5 Redirect org-scoped role routes when accessed without /org/:orgSlug prefix
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/agronomist") ||
    pathname.startsWith("/ops")
  ) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const cookieOrgSlug = request.cookies.get("org_slug")?.value;
    let orgSlug = cookieOrgSlug;

    if (!orgSlug && token) {
      try {
        const payload = await verifySessionToken(token);
        orgSlug = payload.organizationSlug ?? undefined;
      } catch {
        orgSlug = cookieOrgSlug ?? undefined;
      }
    }

    if (orgSlug) {
      const url = request.nextUrl.clone();
      url.pathname = `/org/${orgSlug}${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  // 4. Global Role Protection (non-org routes like /buyer/dashboard)
  const globalRoleRule = roleRouteMap.find((rule) => pathname.startsWith(rule.prefix));
  if (globalRoleRule) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const payload = await verifySessionToken(token);
      if (!payload.roles.some((role) => globalRoleRule.roles.includes(role))) {
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 5. API Route Protection
  if (pathname.startsWith("/api")) {
    const isPublicApi = pathname.startsWith("/api/public") || pathname.startsWith("/api/auth") || pathname.startsWith("/api/health");
    let apiUserId: string | null = null;
    
    if (!isPublicApi) {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      if (token) {
        try {
          const payload = await verifySessionToken(token);
          apiUserId = payload.sub;
          if (payload.organizationId && payload.organizationStatus !== "ACTIVE" && payload.organizationStatus !== "TRIAL") {
            return new NextResponse(JSON.stringify({ message: "Organization is inactive." }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch {
          // allow to proceed to API handler which will return 401
        }
      }
    }

    // Rate limiting for API writes
    const writePolicy = getWriteRateLimitPolicy({
      pathname,
      method: request.method,
      ip,
      userId: apiUserId,
    });
    if (writePolicy) {
      const limitCheck = rateLimiter.check(writePolicy.key, writePolicy.limit, writePolicy.windowMs);
      if (!limitCheck.success) {
        return new NextResponse("Too many requests", { status: 429 });
      }
      rateLimiter.fail(writePolicy.key, writePolicy.limit, writePolicy.windowMs);
    }
  }

  // 6. CSRF Protection for API writes
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    !pathname.startsWith("/api/auth/login") &&
    !pathname.startsWith("/api/auth/signup")
  ) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const csrfHeader = request.headers.get("X-CSRF-Token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new NextResponse("CSRF Validation Failed", { status: 403 });
    }
  }

  const response = NextResponse.next();
  // Final check for CSRF cookie
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    const token = crypto.randomUUID();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
