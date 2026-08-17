import { supabase } from "./supabase";
import { getSession } from "./auth";
import { FORMACION_URL } from "../data/site";

const IS_DEV = import.meta.env.DEV;

/** Where the admin section's own login page lives: /admin/login locally, /login once deployed to its own subdomain root. */
const ADMIN_LOGIN_URL = IS_DEV ? "/admin/login" : "/login";

/** Where to send a logged-in-but-not-admin user: /campus locally, formacion.droneduca.es/campus in production. */
const CAMPUS_URL = IS_DEV ? "/campus" : `${FORMACION_URL}/campus`;

/**
 * Path to another page within the admin section. Locally the whole project is served together, so admin pages
 * live under /admin/*; in production the admin section is deployed to its own subdomain root (admin.droneduca.es),
 * so the /admin prefix is dropped. `path` should start with "/", e.g. adminPath("/alumnos").
 */
export function adminPath(path: string): string {
  return IS_DEV ? `/admin${path}` : path;
}

/** Path to the admin dashboard itself (the one case with no trailing path segment). */
export function adminHomePath(): string {
  return IS_DEV ? "/admin" : "/";
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin ?? false;
}

/**
 * Redirects to the admin section's own login (if there's no session at all) or to /campus (if logged in but not
 * an admin), and returns null in either case. Deliberately does not reuse requireSession() from lib/auth.ts,
 * because that one sends people to formacion.droneduca.es's login — admin pages have their own gateway instead.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    window.location.href = ADMIN_LOGIN_URL;
    return null;
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    window.location.href = CAMPUS_URL;
    return null;
  }
  return session;
}
