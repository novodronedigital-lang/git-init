import { requireSession } from "./auth";
import { isAdmin } from "./admin";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export interface CourseAccess {
  session: Session;
  hasAccess: boolean;
}

/**
 * Redirects to login when logged out (via requireSession). Otherwise resolves the session plus whether
 * this user can see the given course: free courses, an active enrollment row, or an admin account.
 */
export async function requireCourseAccess(courseSlug: string): Promise<CourseAccess | null> {
  const session = await requireSession();
  if (!session) return null;

  let hasAccess = courseSlug === "drone-starter";
  if (!hasAccess) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("course_slug")
      .eq("user_id", session.user.id)
      .eq("course_slug", courseSlug)
      .maybeSingle();
    hasAccess = !!enrollment;
  }
  if (!hasAccess) {
    hasAccess = await isAdmin(session.user.id);
  }

  return { session, hasAccess };
}
