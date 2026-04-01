import type {
  Task,
  GanttOptions,
  BarLayout,
  LabelLayout,
  LabelPlacement,
  DependencyArrow,
  TimeRange,
} from "./types.js";
import { dateToX, colorForIndex, clamp } from "./utils.js";

// ---- Pretext types (minimal surface we depend on) ----
interface PretextHandle {
  prepare(texts: string[]): void;
  layout(text: string): { width: number; height: number };
}

/**
 * Resolve the effective time range from tasks + options.
 */
export function resolveTimeRange(
  tasks: Task[],
  optRange?: TimeRange,
): TimeRange {
  if (optRange) return optRange;
  if (tasks.length === 0) {
    const now = new Date();
    return { start: now, end: new Date(now.getTime() + 30 * 86_400_000) };
  }
  let min = tasks[0].start.getTime();
  let max = tasks[0].end.getTime();
  for (const t of tasks) {
    if (t.start.getTime() < min) min = t.start.getTime();
    if (t.end.getTime() > max) max = t.end.getTime();
  }
  // Add 5% padding on each side
  const pad = (max - min) * 0.05 || 86_400_000;
  return { start: new Date(min - pad), end: new Date(max + pad) };
}

/**
 * Decide label placement for a single task bar.
 *
 * Algorithm:
 *   1. Measure full label width via Pretext layout()
 *   2. If label fits inside bar (with padding) -> "inside"
 *   3. Else if label fits outside bar to the right (within chart) -> "outside"
 *   4. Else truncate label to fit available space -> "truncated"
 *   5. If even "..." doesn't fit -> "hidden"
 */
export function decideLabelPlacement(
  label: string,
  barWidth: number,
  barX: number,
  chartWidth: number,
  pretext: PretextHandle,
  padding: number = 8,
): { placement: LabelPlacement; text: string; labelWidth: number } {
  const measured = pretext.layout(label);
  const fullWidth = measured.width;

  // Inside: label + padding on both sides
  if (fullWidth + padding * 2 <= barWidth) {
    return { placement: "inside", text: label, labelWidth: fullWidth };
  }

  // Outside right: enough room between bar end and chart edge
  const spaceRight = chartWidth - (barX + barWidth);
  if (fullWidth + padding * 2 <= spaceRight) {
    return { placement: "outside", text: label, labelWidth: fullWidth };
  }

  // Truncate: binary search for longest fitting substring + ellipsis
  const ellipsis = "\u2026";
  const maxSpace = Math.max(barWidth, spaceRight) - padding * 2;

  if (maxSpace <= 0) {
    return { placement: "hidden", text: "", labelWidth: 0 };
  }

  // Check if even ellipsis alone fits
  const ellipsisWidth = pretext.layout(ellipsis).width;
  if (ellipsisWidth > maxSpace) {
    return { placement: "hidden", text: "", labelWidth: 0 };
  }

  // Binary search for truncation point
  let lo = 1;
  let hi = label.length - 1;
  let best = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const candidate = label.slice(0, mid) + ellipsis;
    const w = pretext.layout(candidate).width;
    if (w <= maxSpace) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best === 0) {
    return { placement: "hidden", text: "", labelWidth: 0 };
  }

  const truncated = label.slice(0, best) + ellipsis;
  const truncWidth = pretext.layout(truncated).width;
  const placeTruncInside = truncWidth + padding * 2 <= barWidth;

  return {
    placement: "truncated",
    text: truncated,
    labelWidth: truncWidth,
  };
}

/**
 * Compute full layout for all tasks.
 * All label measurements happen here via Pretext -- before any paint.
 */
export function computeLayout(
  tasks: Task[],
  options: GanttOptions,
  pretext: PretextHandle,
  chartWidth: number,
): { bars: BarLayout[]; arrows: DependencyArrow[] } {
  const barHeight = options.barHeight ?? 32;
  const rowGap = options.rowGap ?? 8;
  const headerHeight = options.headerHeight ?? 48;
  const padding = options.padding ?? 8;

  const range = resolveTimeRange(tasks, options.timeRange);

  // Step 1: prepare all labels in Pretext (batch measurement)
  pretext.prepare(tasks.map((t) => t.label));

  // Step 2: compute bar geometry + label placement
  const bars: BarLayout[] = [];
  const taskMap = new Map<string, BarLayout>();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const barX = dateToX(task.start, range.start, range.end, chartWidth);
    const barEnd = dateToX(task.end, range.start, range.end, chartWidth);
    const barW = Math.max(barEnd - barX, 2); // min 2px
    const barY = headerHeight + i * (barHeight + rowGap);
    const color = task.color ?? colorForIndex(i);

    const labelResult = decideLabelPlacement(
      task.label,
      barW,
      barX,
      chartWidth,
      pretext,
      padding,
    );

    // Compute label x position
    let labelX: number;
    if (labelResult.placement === "inside" || labelResult.placement === "truncated") {
      // Center inside bar, or left-align with padding
      labelX = barX + padding;
    } else if (labelResult.placement === "outside") {
      labelX = barX + barW + padding;
    } else {
      labelX = 0;
    }

    const labelY = barY + barHeight / 2;

    const labelLayout: LabelLayout = {
      taskId: task.id,
      placement: labelResult.placement,
      text: labelResult.text,
      x: labelX,
      y: labelY,
      width: labelResult.labelWidth,
    };

    const bar: BarLayout = {
      taskId: task.id,
      x: barX,
      y: barY,
      width: barW,
      height: barHeight,
      color,
      progress: clamp(task.progress ?? 0, 0, 1),
      label: labelLayout,
    };

    bars.push(bar);
    taskMap.set(task.id, bar);
  }

  // Step 3: compute dependency arrows
  const arrows: DependencyArrow[] = [];
  if (options.showDependencies !== false) {
    for (const task of tasks) {
      if (!task.dependencies) continue;
      const toBar = taskMap.get(task.id);
      if (!toBar) continue;
      for (const depId of task.dependencies) {
        const fromBar = taskMap.get(depId);
        if (!fromBar) continue;
        arrows.push({
          fromId: depId,
          toId: task.id,
          fromX: fromBar.x + fromBar.width,
          fromY: fromBar.y + fromBar.height / 2,
          toX: toBar.x,
          toY: toBar.y + toBar.height / 2,
        });
      }
    }
  }

  return { bars, arrows };
}
