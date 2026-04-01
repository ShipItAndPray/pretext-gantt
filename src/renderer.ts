import type {
  BarLayout,
  DependencyArrow,
  TimeRange,
} from "./types.js";
import { darken, formatDate, formatMonth, dateToX } from "./utils.js";

/** Render the time header (months / day ticks). */
export function renderHeader(
  ctx: CanvasRenderingContext2D,
  range: TimeRange,
  chartWidth: number,
  headerHeight: number,
  font: string,
): void {
  ctx.save();

  // Background
  ctx.fillStyle = "#1E1E2E";
  ctx.fillRect(0, 0, chartWidth, headerHeight);

  // Month labels
  ctx.fillStyle = "#A0A0B8";
  ctx.font = `bold 11px ${font}`;
  ctx.textBaseline = "middle";

  const start = new Date(range.start);
  start.setDate(1);
  const cursor = new Date(start);

  while (cursor.getTime() <= range.end.getTime()) {
    const x = dateToX(cursor, range.start, range.end, chartWidth);
    if (x >= 0 && x < chartWidth) {
      ctx.fillText(formatMonth(cursor), Math.max(x + 4, 4), headerHeight / 3);
      // Vertical month line
      ctx.strokeStyle = "#2A2A3E";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, headerHeight * 0.6);
      ctx.lineTo(x, headerHeight);
      ctx.stroke();
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Week tick marks
  const weekCursor = new Date(range.start);
  // Align to Monday
  const day = weekCursor.getDay();
  const diff = day === 0 ? 1 : (8 - day) % 7;
  weekCursor.setDate(weekCursor.getDate() + diff);

  ctx.fillStyle = "#606078";
  ctx.font = `10px ${font}`;

  while (weekCursor.getTime() <= range.end.getTime()) {
    const x = dateToX(weekCursor, range.start, range.end, chartWidth);
    if (x >= 0 && x < chartWidth) {
      ctx.fillText(formatDate(weekCursor), x + 2, (headerHeight * 2) / 3 + 4);
    }
    weekCursor.setDate(weekCursor.getDate() + 7);
  }

  // Bottom border
  ctx.strokeStyle = "#333348";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight - 0.5);
  ctx.lineTo(chartWidth, headerHeight - 0.5);
  ctx.stroke();

  ctx.restore();
}

/** Render all task bars with progress fills. */
export function renderBars(
  ctx: CanvasRenderingContext2D,
  bars: BarLayout[],
): void {
  const radius = 4;

  for (const bar of bars) {
    ctx.save();

    // Background bar (full)
    ctx.fillStyle = bar.color;
    ctx.globalAlpha = 0.3;
    roundRect(ctx, bar.x, bar.y, bar.width, bar.height, radius);
    ctx.fill();

    // Progress fill
    if (bar.progress > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = bar.color;
      const pw = bar.width * bar.progress;
      roundRect(ctx, bar.x, bar.y, pw, bar.height, radius);
      ctx.fill();
    }

    // Border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = bar.color;
    ctx.lineWidth = 1;
    roundRect(ctx, bar.x, bar.y, bar.width, bar.height, radius);
    ctx.stroke();

    ctx.restore();
  }
}

/** Render all labels at their pre-computed positions. */
export function renderLabels(
  ctx: CanvasRenderingContext2D,
  bars: BarLayout[],
  font: string,
): void {
  ctx.save();
  ctx.font = `13px ${font}`;
  ctx.textBaseline = "middle";

  for (const bar of bars) {
    const label = bar.label;
    if (label.placement === "hidden") continue;

    if (label.placement === "inside") {
      ctx.fillStyle = "#FFFFFF";
    } else if (label.placement === "outside") {
      ctx.fillStyle = "#C0C0D0";
    } else {
      // truncated
      ctx.fillStyle = "#FFFFFF";
    }

    ctx.fillText(label.text, label.x, label.y);
  }

  ctx.restore();
}

/** Render dependency arrows between bars. */
export function renderArrows(
  ctx: CanvasRenderingContext2D,
  arrows: DependencyArrow[],
): void {
  ctx.save();
  ctx.strokeStyle = "#606078";
  ctx.fillStyle = "#606078";
  ctx.lineWidth = 1.5;

  const arrowSize = 6;

  for (const a of arrows) {
    ctx.beginPath();

    // Route: right from source, down/up, then left to target
    const midX = a.fromX + 12;
    ctx.moveTo(a.fromX, a.fromY);
    ctx.lineTo(midX, a.fromY);
    ctx.lineTo(midX, a.toY);
    ctx.lineTo(a.toX - 2, a.toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(a.toX, a.toY);
    ctx.lineTo(a.toX - arrowSize, a.toY - arrowSize / 2);
    ctx.lineTo(a.toX - arrowSize, a.toY + arrowSize / 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/** Render today marker. */
export function renderTodayLine(
  ctx: CanvasRenderingContext2D,
  range: TimeRange,
  chartWidth: number,
  chartHeight: number,
  headerHeight: number,
): void {
  const now = new Date();
  if (now < range.start || now > range.end) return;

  const x = dateToX(now, range.start, range.end, chartWidth);

  ctx.save();
  ctx.strokeStyle = "#EF4444";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, headerHeight);
  ctx.lineTo(x, chartHeight);
  ctx.stroke();

  // "Today" label
  ctx.setLineDash([]);
  ctx.fillStyle = "#EF4444";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Today", x, headerHeight - 4);

  ctx.restore();
}

/** Row gridlines for visual separation. */
export function renderGridRows(
  ctx: CanvasRenderingContext2D,
  barCount: number,
  barHeight: number,
  rowGap: number,
  headerHeight: number,
  chartWidth: number,
): void {
  ctx.save();
  ctx.strokeStyle = "#1E1E2E";
  ctx.lineWidth = 1;

  for (let i = 0; i <= barCount; i++) {
    const y = headerHeight + i * (barHeight + rowGap) - rowGap / 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draw a rounded rectangle path. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
