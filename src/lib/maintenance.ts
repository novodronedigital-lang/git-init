import { supabase } from "./supabase";
import { getSession } from "./auth";
import { isAdmin } from "./admin";

const CONTENT_KEY = "site.maintenance";

export async function getMaintenanceMode(): Promise<boolean> {
  const { data } = await supabase.from("site_content").select("content").eq("key", CONTENT_KEY).maybeSingle();
  return Boolean((data?.content as { enabled?: boolean } | undefined)?.enabled);
}

export function setMaintenanceMode(enabled: boolean) {
  return supabase.from("site_content").upsert({ key: CONTENT_KEY, content: { enabled } }, { onConflict: "key" });
}

function isExemptPath(): boolean {
  const hostname = window.location.hostname;
  const path = window.location.pathname;
  if (hostname === "admin.droneduca.es") return true;
  if (hostname === "localhost" && path.startsWith("/admin")) return true;
  if (path.startsWith("/login") || path.startsWith("/registro")) return true;
  return false;
}

/** Covers the page with a maintenance notice for anyone who isn't a logged-in admin, when enabled. */
export async function applyMaintenanceGate() {
  if (isExemptPath()) return;

  const enabled = await getMaintenanceMode();
  if (!enabled) return;

  const session = await getSession();
  if (session && (await isAdmin(session.user.id))) return;

  const overlay = document.getElementById("maintenance-overlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
}
