/**
 * Client-side utility to read the CSRF token from cookies.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  
  const name = "csrf_token=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

/**
 * Enhanced fetch wrapper that automatically includes the CSRF token header
 * for state-changing requests.
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
  const method = options.method?.toUpperCase() || "GET";
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  const timeoutMs = 15000;
  const shouldTimeout = !options.signal;
  const controller = shouldTimeout ? new AbortController() : null;
  const timeoutId = shouldTimeout ? setTimeout(() => controller?.abort(), timeoutMs) : null;

  if (stateChangingMethods.includes(method)) {
    const token = getCsrfToken();
    if (token) {
      options.headers = {
        ...options.headers,
        "X-CSRF-Token": token,
      };
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller?.signal,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
