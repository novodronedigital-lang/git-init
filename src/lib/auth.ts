import { supabase } from "./supabase";

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

/** Redirects to /login and returns null when there is no active session. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    window.location.href = "/login";
    return null;
  }
  return session;
}
