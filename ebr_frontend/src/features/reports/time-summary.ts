type DateRange = { from: string; to: string };
type Resolution = "day" | "week" | "month" | "year";

const DAY_MS = 24 * 60 * 60 * 1000;
const RESOLUTION_LABELS = { day: "ngày", week: "tuần", month: "tháng", year: "năm" };
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);
const displayDay = (day: string) => day.split("-").reverse().join("/");

// Calendar arithmetic uses UTC after dates have been normalized to the reporting timezone.
export const buildTimeSummary = (days: string[], range: DateRange | null) => {
  const sortedDays = [...days].sort();
  const from = range?.from ?? sortedDays[0];
  const to = range?.to ?? sortedDays[sortedDays.length - 1];
  const empty = { resolutionLabel: RESOLUTION_LABELS.day, points: [] as {
    key: string; label: string; tooltipLabel: string; count: number;
  }[] };
  if (!from || !to) return empty;
  const start = toDate(from);
  const end = toDate(to);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) return empty;

  const dayCount = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const resolution: Resolution = dayCount <= 31 ? "day" : dayCount <= 120 ? "week" : dayCount <= 730 ? "month" : "year";
  const getKey = (day: string) => {
    if (resolution === "year") return day.slice(0, 4);
    if (resolution === "month") return day.slice(0, 7);
    if (resolution === "week") {
      const week = Math.floor((toDate(day).getTime() - start.getTime()) / (7 * DAY_MS));
      return toDay(new Date(start.getTime() + week * 7 * DAY_MS));
    }
    return day;
  };
  const counts = new Map<string, number>();
  days.forEach((day) => {
    if (day >= from && day <= to) {
      const key = getKey(day);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  const cursor = new Date(start);
  if (resolution === "month") cursor.setUTCDate(1);
  if (resolution === "year") cursor.setUTCMonth(0, 1);
  const points: typeof empty.points = [];
  while (cursor <= end) {
    const day = toDay(cursor);
    const key = getKey(day);
    let label = displayDay(day).slice(0, 5);
    let tooltipLabel = `Ngày ${displayDay(day)}`;
    if (resolution === "week") {
      const weekEnd = toDay(new Date(Math.min(cursor.getTime() + 6 * DAY_MS, end.getTime())));
      label = `${displayDay(day).slice(0, 5)}–${displayDay(weekEnd).slice(0, 5)}`;
      tooltipLabel = `${displayDay(day)} – ${displayDay(weekEnd)}`;
    } else if (resolution === "month") {
      label = `T${cursor.getUTCMonth() + 1}/${cursor.getUTCFullYear()}`;
      tooltipLabel = `Tháng ${cursor.getUTCMonth() + 1}/${cursor.getUTCFullYear()}`;
    } else if (resolution === "year") {
      label = key;
      tooltipLabel = `Năm ${key}`;
    }
    points.push({ key, label, tooltipLabel, count: counts.get(key) ?? 0 });
    if (resolution === "year") cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
    else if (resolution === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (resolution === "week" ? 7 : 1));
  }
  return { resolutionLabel: RESOLUTION_LABELS[resolution], points };
};
