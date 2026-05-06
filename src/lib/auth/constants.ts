export const AUTH_COOKIE_NAME = "farmiclegrow_session";
export const CSRF_COOKIE_NAME = "csrf_token";
export const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

export const APP_ROLES = ["admin", "agronomist", "ops", "farmer", "buyer"] as const;
export type AppRole = (typeof APP_ROLES)[number];
