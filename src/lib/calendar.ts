export interface CalendarSession {
  id: string;
  title: string;
  starts_at: string;
  join_url?: string | null;
}

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  sessions: CalendarSession[];
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Builds a Monday-first 6x7 grid of days for the given month (0-indexed), with sessions bucketed per day. */
export function buildMonthGrid(year: number, month: number, sessions: CalendarSession[]): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const todayKey = dateKey(new Date());

  const sessionsByDay = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const key = dateKey(new Date(session.starts_at));
    const list = sessionsByDay.get(key) ?? [];
    list.push(session);
    sessionsByDay.set(key, list);
  }

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const key = dateKey(date);
    days.push({
      date,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
      sessions: (sessionsByDay.get(key) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    });
  }
  return days;
}

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
