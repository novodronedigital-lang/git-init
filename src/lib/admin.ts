import { supabase } from "./supabase";
import { requireSession } from "./auth";

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin ?? false;
}

/** Redirects to /login (no session) or /campus (logged in but not admin) and returns null in either case. */
export async function requireAdmin() {
  const session = await requireSession();
  if (!session) return null;

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    window.location.href = "/campus";
    return null;
  }
  return session;
}
