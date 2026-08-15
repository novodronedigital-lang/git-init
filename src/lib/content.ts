import { supabase } from "./supabase";

/** Reads a site_content row at build time, falling back to a default if it doesn't exist yet. */
export async function getContent<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data } = await supabase.from("site_content").select("content").eq("key", key).maybeSingle();
    return (data?.content as T) ?? fallback;
  } catch {
    return fallback;
  }
}
