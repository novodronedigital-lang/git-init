import type { CollectionEntry } from "astro:content";

type Course = CollectionEntry<"courses">;

export interface FlatLesson {
  number: number;
  title: string;
  moduleIndex: number;
  moduleTitle: string;
  instructor?: string;
}

/** Flattens a course's modules into a single numbered list matching Supabase's `lesson_order`. */
export function flattenLessons(course: Course): FlatLesson[] {
  let number = 0;
  return course.data.modules.flatMap((mod, moduleIndex) =>
    mod.lessons.map((title) => {
      number += 1;
      return { number, title, moduleIndex, moduleTitle: mod.title, instructor: mod.instructor };
    }),
  );
}

/** The [start, end] global lesson numbers (inclusive) that belong to a given module index. */
export function moduleLessonRange(course: Course, moduleIndex: number): { start: number; end: number } {
  let start = 1;
  for (let i = 0; i < moduleIndex; i++) start += course.data.modules[i].lessons.length;
  const end = start + course.data.modules[moduleIndex].lessons.length - 1;
  return { start, end };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Rotates through the brand palette so each module/instructor gets a consistent accent color. */
export const MODULE_COLORS = ["#0f5aef", "#fb8500", "#2a3c5b", "#0c46c2", "#0f2e6e", "#db6a00"];
