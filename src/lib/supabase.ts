import { createClient } from "@supabase/supabase-js";

/**
 * Session storage backed by a cookie shared across all *.droneduca.es subdomains, so logging in on
 * formacion.droneduca.es also counts as logged in on admin.droneduca.es (and vice versa). Falls back to
 * behaving as a no-op outside the browser (build time) and to a plain per-origin cookie on localhost, where
 * there's no cross-domain sharing to do anyway.
 */
function isBrowser() {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

function sharedCookieDomain(): string {
  if (!isBrowser()) return "";
  return window.location.hostname.endsWith("droneduca.es") ? "; domain=.droneduca.es" : "";
}

const cookieStorage = {
  getItem(key: string) {
    if (!isBrowser()) return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem(key: string, value: string) {
    if (!isBrowser()) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const maxAge = 60 * 60 * 24 * 100; // 100 días
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${sharedCookieDomain()}${secure}`;
  },
  removeItem(key: string) {
    if (!isBrowser()) return;
    document.cookie = `${key}=; path=/; max-age=0${sharedCookieDomain()}`;
  },
};

export const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: cookieStorage,
  },
});
