// /lib/apiClient.ts

interface FetchApiOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * A wrapper around native `fetch` that handles:
 * - Timeouts via AbortController (default 10s)
 * - Cache busting (default 'no-store' for GET)
 * - Global 401/403 Session Expiry redirection
 */
export async function fetchApi(url: string, options: FetchApiOptions = {}): Promise<Response> {
  const { timeoutMs = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const finalOptions: RequestInit = {
    ...fetchOptions,
    signal: fetchOptions.signal || controller.signal,
  };

  // Prevent stale cache on GET requests by default
  if (!finalOptions.method || finalOptions.method.toUpperCase() === 'GET') {
    finalOptions.cache = finalOptions.cache || 'no-store';
  }

  try {
    const response = await fetch(url, finalOptions);
    clearTimeout(id);

    // Global session expiry handling (client-side only)
    if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
      // Don't redirect if we are already on the login page or checking auth explicitly
      if (!window.location.pathname.toLowerCase().includes('/login') && !url.includes('/api/auth/me')) {
        window.location.href = '/Login?expired=true';
      }
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.error(`[API Timeout] Request to ${url} exceeded ${timeoutMs}ms`);
      // Attach custom property so we can identify it in the UI
      error.isTimeout = true;
      error.message = 'Network connection timed out.';
    }
    throw error;
  }
}
