import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { AUTH_COOKIE_NAME, SESSION_DURATION_SECONDS, type AppRole } from "@/lib/auth/constants";

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  roles: AppRole[];
  mustChangePassword: boolean;
  sessionId: string;
  organizationId: string | null;
  organizationSlug: string | null;
  organizationStatus: string | null;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
  name: string;
  roles: AppRole[];
  mustChangePassword: boolean;
  sessionId: string;
  organizationId: string | null;
  organizationSlug: string | null;
  organizationStatus: string | null;
}) {
  const secret = getSessionSecret();

  return new SignJWT({
    email: payload.email,
    name: payload.name,
    roles: payload.roles,
    mustChangePassword: payload.mustChangePassword,
    sessionId: payload.sessionId,
    organizationId: payload.organizationId,
    organizationSlug: payload.organizationSlug,
    organizationStatus: payload.organizationStatus,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

export async function createMfaChallengeToken(payload: {
  userId: string;
  organizationId: string | null;
}) {
  const secret = getSessionSecret();

  return new SignJWT({
    type: "mfa_challenge",
    organizationId: payload.organizationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("5m") // MFA challenge expires in 5 minutes
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const secret = getSessionSecret();
  const { payload } = await jwtVerify<SessionPayload>(token, secret);
  return payload;
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

export { AUTH_COOKIE_NAME };
