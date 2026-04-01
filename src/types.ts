/** A single task/bar in the Gantt chart. */
export interface Task {
  id: string;
  label: string;
  start: Date;
  end: Date;
  color?: string;
  progress?: number; // 0-1
  dependencies?: string[];
  group?: string;
}

/** Time range for the visible chart area. */
export interface TimeRange {
  start: Date;
  end: Date;
}

/** Options passed to createGantt / GanttChart constructor. */
export interface GanttOptions {
  tasks: Task[];
  font: string;
  barHeight?: number;
  rowGap?: number;
  timeRange?: TimeRange;
  showDependencies?: boolean;
  headerHeight?: number;
  padding?: number;
}

/** Where a label is rendered relative to its bar. */
export type LabelPlacement = "inside" | "outside" | "truncated" | "hidden";

/** Result of the Pretext-based label layout for a single task. */
export interface LabelLayout {
  taskId: string;
  placement: LabelPlacement;
  text: string; // possibly truncated
  x: number;
  y: number;
  width: number;
}

/** Internal bar geometry after layout. */
export interface BarLayout {
  taskId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  progress: number;
  label: LabelLayout;
}

/** Dependency arrow between two bars. */
export interface DependencyArrow {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}
