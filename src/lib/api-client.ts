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

  const timeoutMs = stateChangingMethods.includes(method) ? 30000 : 15000;
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
    try {
      return await fetch(url, {
        ...options,
        signal: options.signal ?? controller?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return new Response(JSON.stringify({ message: "Request timed out. Please try again." }), {
          status: 408,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error instanceof TypeError) {
        return new Response(JSON.stringify({ message: "Network error. Please check your connection and try again." }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw error;
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
