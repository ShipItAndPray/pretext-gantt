import type { Task, GanttOptions, TimeRange } from "./types.js";
import { computeLayout, resolveTimeRange } from "./layout.js";
import {
  renderHeader,
  renderBars,
  renderLabels,
  renderArrows,
  renderTodayLine,
  renderGridRows,
} from "./renderer.js";

// Minimal Pretext surface we call
interface PretextModule {
  prepare(font: string, texts: string[]): void;
  layout(font: string, text: string): { width: number; height: number };
}

/**
 * GanttChart — zero-flicker Gantt chart powered by Pretext.
 *
 * All label measurements happen via Pretext.prepare() + layout()
 * *before* the first paint. No layout shift, no flicker.
 */
export class GanttChart {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tasks: Task[] = [];
  private font: string;
  private barHeight: number;
  private rowGap: number;
  private headerHeight: number;
  private padding: number;
  private showDependencies: boolean;
  private timeRange?: TimeRange;
  private pretext: PretextModule;
  private dpr: number;

  constructor(container: HTMLElement, options: GanttOptions, pretext: PretextModule) {
    this.container = container;
    this.font = options.font;
    this.barHeight = options.barHeight ?? 32;
    this.rowGap = options.rowGap ?? 8;
    this.headerHeight = options.headerHeight ?? 48;
    this.padding = options.padding ?? 8;
    this.showDependencies = options.showDependencies !== false;
    this.timeRange = options.timeRange;
    this.pretext = pretext;
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.display = "block";
    container.appendChild(this.canvas);

    const rawCtx = this.canvas.getContext("2d");
    if (!rawCtx) throw new Error("Canvas 2D context not available");
    this.ctx = rawCtx;

    this.tasks = options.tasks;
  }

  /** Replace all tasks and re-render. */
  setTasks(tasks: Task[]): void {
    this.tasks = tasks;
    this.render();
  }

  /** Override the visible time range. */
  setTimeRange(start: Date, end: Date): void {
    this.timeRange = { start, end };
    this.render();
  }

  /** Set chart width explicitly (triggers re-layout, no re-measure). */
  setWidth(width: number): void {
    this.canvas.style.width = `${width}px`;
    this.render();
  }

  /** Full render: measure labels via Pretext, layout, paint. */
  render(): void {
    const rect = this.container.getBoundingClientRect();
    const cssWidth = rect.width;
    const chartHeight =
      this.headerHeight +
      this.tasks.length * (this.barHeight + this.rowGap) +
      this.rowGap;

    // Size canvas for HiDPI
    this.canvas.width = cssWidth * this.dpr;
    this.canvas.height = chartHeight * this.dpr;
    this.canvas.style.height = `${chartHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Clear
    this.ctx.fillStyle = "#141420";
    this.ctx.fillRect(0, 0, cssWidth, chartHeight);

    if (this.tasks.length === 0) return;

    const range = resolveTimeRange(this.tasks, this.timeRange);
    const font = this.font;

    // Wrap Pretext into the interface layout.ts expects
    const pt = this.pretext;
    const pretextHandle = {
      prepare: (texts: string[]) => pt.prepare(font, texts),
      layout: (text: string) => pt.layout(font, text),
    };

    // Compute layout (all label decisions made here, before paint)
    const { bars, arrows } = computeLayout(
      this.tasks,
      {
        tasks: this.tasks,
        font: this.font,
        barHeight: this.barHeight,
        rowGap: this.rowGap,
        timeRange: this.timeRange,
        showDependencies: this.showDependencies,
        headerHeight: this.headerHeight,
        padding: this.padding,
      },
      pretextHandle,
      cssWidth,
    );

    // Paint in order: grid -> header -> bars -> labels -> arrows -> today
    renderGridRows(
      this.ctx,
      this.tasks.length,
      this.barHeight,
      this.rowGap,
      this.headerHeight,
      cssWidth,
    );
    renderHeader(this.ctx, range, cssWidth, this.headerHeight, this.font);
    renderBars(this.ctx, bars);
    renderLabels(this.ctx, bars, this.font);
    renderArrows(this.ctx, arrows);
    renderTodayLine(this.ctx, range, cssWidth, chartHeight, this.headerHeight);
  }

  /** Remove canvas and clean up. */
  destroy(): void {
    this.canvas.remove();
  }
}

/**
 * Create a Gantt chart in the given container.
 * Pretext module must be passed in (peer dependency).
 */
export function createGantt(
  container: HTMLElement,
  options: GanttOptions,
  pretext: PretextModule,
): GanttChart {
  const chart = new GanttChart(container, options, pretext);
  chart.render();
  return chart;
}
