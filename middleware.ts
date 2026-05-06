import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, type AppRole } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { rateLimiter } from "@/lib/security/rate-limit";

const roleRouteMap: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/agronomist", roles: ["admin", "agronomist"] },
  { prefix: "/ops", roles: ["admin", "ops"] },
  { prefix: "/buyer", roles: ["admin", "buyer"] },
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1";

  // 1. Basic Rate Limiting for sensitive routes
  // (Note: In-memory Maps do not persist across Edge invocations reliably. Login is handled in its API route.)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth/login") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const limitCheck = rateLimiter.check(ip, 50);
    
    if (!limitCheck.success) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "50",
          "X-RateLimit-Remaining": "0",
        },
      });
    }
    
    // Only count it if we proceed
    rateLimiter.fail(ip, 50, 60000); // generic 1 minute window for API writes
  }

  // 2. Double Submit Cookie CSRF Protection
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    !pathname.startsWith("/api/auth/login")
  ) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const csrfHeader = request.headers.get("X-CSRF-Token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new NextResponse("CSRF Validation Failed", { status: 403 });
    }
  }

  // 3. Role-based Access Control
  const roleRule =
    pathname.startsWith("/buyer/signup") ? undefined : roleRouteMap.find((rule) => pathname.startsWith(rule.prefix));

  if (roleRule) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const payload = await verifySessionToken(token);
      
      const hasRole = payload.roles.some((role) => roleRule.roles.includes(role));

      if (!hasRole) {
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
    } catch {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // 4. Ensure CSRF token is present in cookies (Double Submit pattern)
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    const token = crypto.randomUUID();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by frontend JS
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*", 
    "/agronomist/:path*", 
    "/ops/:path*",
    "/buyer/:path*",
    "/api/:path*",
  ],
};
