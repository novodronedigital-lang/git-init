import { supabase } from "./supabase";
import { SITE_TARGET, FORMACION_URL } from "../data/site";

const IS_DEV = import.meta.env.DEV;
const LOGIN_URL = IS_DEV || SITE_TARGET === "formacion" ? "/login" : `${FORMACION_URL}/login`;

export function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Redirects to /login (on formacion.droneduca.es, cross-domain if needed) and returns null when logged out. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    window.location.href = LOGIN_URL;
    return null;
  }
  return session;
}
