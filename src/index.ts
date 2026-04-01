export { GanttChart, createGantt } from "./gantt.js";
export { computeLayout, resolveTimeRange, decideLabelPlacement } from "./layout.js";
export {
  renderHeader,
  renderBars,
  renderLabels,
  renderArrows,
  renderTodayLine,
  renderGridRows,
} from "./renderer.js";
export { dateToX, daysBetween, clamp, colorForIndex, lighten, darken, formatDate, formatMonth } from "./utils.js";
export type {
  Task,
  GanttOptions,
  TimeRange,
  LabelPlacement,
  LabelLayout,
  BarLayout,
  DependencyArrow,
} from "./types.js";
