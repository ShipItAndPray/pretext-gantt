/** Milliseconds in a single day. */
export const MS_PER_DAY = 86_400_000;

/** Number of days between two dates (fractional). */
export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

/** Map a date to a pixel x-position within the chart area. */
export function dateToX(
  date: Date,
  rangeStart: Date,
  rangeEnd: Date,
  chartWidth: number,
): number {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  if (total <= 0) return 0;
  const offset = date.getTime() - rangeStart.getTime();
  return (offset / total) * chartWidth;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Default color palette for tasks without explicit colors. */
const PALETTE = [
  "#4F8EF7", // blue
  "#34D399", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

/** Get a deterministic color for a task index. */
export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Lighten a hex color by a fraction (0-1). */
export function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Darken a hex color by a fraction (0-1). */
export function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Format a date as "MMM DD" (e.g. "Jan 15"). */
export function formatDate(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** Format a date as "MMM YYYY" (e.g. "Jan 2026"). */
export function formatMonth(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
