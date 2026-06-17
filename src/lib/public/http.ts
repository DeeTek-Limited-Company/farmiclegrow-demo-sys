import { NextResponse } from "next/server";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function getAllowedOrigins() {
  const raw = process.env.PUBLIC_CORS_ORIGINS || process.env.NEXT_PUBLIC_CORS_ORIGINS || "";
  const fromList = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const fromSite = (process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "").trim();
  const candidates = [...fromList, ...(fromSite ? [fromSite] : [])]
    .map((v) => {
      try {
        return new URL(normalizeBaseUrl(v)).origin;
      } catch {
        return null;
      }
    })
    .filter((v): v is string => Boolean(v));

  return new Set(candidates);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

export function withPublicCors(request: Request, response: NextResponse) {
  const allowed = getAllowedOrigins();
  const origin = request.headers.get("origin");
  if (origin && allowed.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.append("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function publicOptions(request: Request) {
  return withPublicCors(request, new NextResponse(null, { status: 204 }));
}

export function publicNotFound(request: Request) {
  return withPublicCors(request, NextResponse.json({ message: "Not found." }, { status: 404 }));
}

export function publicRateLimited(
  request: Request,
  params: { limit: number; remaining: number; reset: number },
) {
  const now = Date.now();
  const retryAfter = Math.max(0, Math.ceil((params.reset - now) / 1000));
  return withPublicCors(
    request,
    NextResponse.json(
      { message: "Too many requests." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": params.limit.toString(),
          "X-RateLimit-Remaining": params.remaining.toString(),
          "X-RateLimit-Reset": params.reset.toString(),
        },
      },
    ),
  );
}
