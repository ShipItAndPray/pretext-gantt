import { describe, it, expect, vi } from "vitest";
import { decideLabelPlacement, computeLayout, resolveTimeRange } from "../layout.js";
import type { Task } from "../types.js";

// Mock Pretext handle: width = chars * 8 (monospace approximation)
function mockPretext(charWidth = 8) {
  return {
    prepare: vi.fn(),
    layout: vi.fn((text: string) => ({
      width: text.length * charWidth,
      height: 14,
    })),
  };
}

describe("decideLabelPlacement", () => {
  it("places label inside when bar is wide enough", () => {
    const pt = mockPretext(8);
    // "Task A" = 6 chars * 8 = 48px, bar = 200px, padding = 8 => 48 + 16 = 64 <= 200
    const result = decideLabelPlacement("Task A", 200, 0, 800, pt, 8);
    expect(result.placement).toBe("inside");
    expect(result.text).toBe("Task A");
  });

  it("places label outside when bar is too narrow but space exists", () => {
    const pt = mockPretext(8);
    // "Long Task Name" = 14 chars * 8 = 112px, bar = 40px, chartWidth = 800, barX = 0
    // space right = 800 - 40 = 760, 112 + 16 = 128 <= 760
    const result = decideLabelPlacement("Long Task Name", 40, 0, 800, pt, 8);
    expect(result.placement).toBe("outside");
    expect(result.text).toBe("Long Task Name");
  });

  it("truncates label when no room inside or outside", () => {
    const pt = mockPretext(8);
    // "Very Long Task Name Here" = 24 chars * 8 = 192px
    // bar = 50px, barX = 700, chartWidth = 750
    // space right = 750 - 750 = 0
    // maxSpace = max(50, 0) - 16 = 34px => can fit ~4 chars
    const result = decideLabelPlacement(
      "Very Long Task Name Here",
      50,
      700,
      750,
      pt,
      8,
    );
    expect(result.placement).toBe("truncated");
    expect(result.text).toContain("\u2026");
    expect(result.text.length).toBeLessThan("Very Long Task Name Here".length);
  });

  it("hides label when absolutely no space", () => {
    const pt = mockPretext(8);
    // bar = 2px, barX = 798, chartWidth = 800
    // space right = 0, maxSpace = max(2, 0) - 16 = -14
    const result = decideLabelPlacement("Task", 2, 798, 800, pt, 8);
    expect(result.placement).toBe("hidden");
    expect(result.text).toBe("");
  });
});

describe("resolveTimeRange", () => {
  it("returns optRange when provided", () => {
    const s = new Date("2026-01-01");
    const e = new Date("2026-03-01");
    const result = resolveTimeRange([], { start: s, end: e });
    expect(result.start).toBe(s);
    expect(result.end).toBe(e);
  });

  it("computes range from tasks with padding", () => {
    const tasks: Task[] = [
      { id: "1", label: "A", start: new Date("2026-01-10"), end: new Date("2026-01-20") },
      { id: "2", label: "B", start: new Date("2026-01-15"), end: new Date("2026-02-15") },
    ];
    const result = resolveTimeRange(tasks);
    expect(result.start.getTime()).toBeLessThan(new Date("2026-01-10").getTime());
    expect(result.end.getTime()).toBeGreaterThan(new Date("2026-02-15").getTime());
  });

  it("returns default 30-day range when no tasks", () => {
    const result = resolveTimeRange([]);
    const diff = result.end.getTime() - result.start.getTime();
    expect(diff).toBe(30 * 86_400_000);
  });
});

describe("computeLayout", () => {
  it("returns bars and arrows for tasks with dependencies", () => {
    const pt = mockPretext();
    const tasks: Task[] = [
      {
        id: "1",
        label: "Design",
        start: new Date("2026-01-01"),
        end: new Date("2026-01-15"),
        color: "#4F8EF7",
      },
      {
        id: "2",
        label: "Develop",
        start: new Date("2026-01-10"),
        end: new Date("2026-02-01"),
        dependencies: ["1"],
      },
    ];

    const { bars, arrows } = computeLayout(
      tasks,
      {
        tasks,
        font: "sans-serif",
        barHeight: 32,
        rowGap: 8,
      },
      pt,
      800,
    );

    expect(bars).toHaveLength(2);
    expect(arrows).toHaveLength(1);
    expect(arrows[0].fromId).toBe("1");
    expect(arrows[0].toId).toBe("2");

    // Verify prepare was called with all labels
    expect(pt.prepare).toHaveBeenCalledWith(["Design", "Develop"]);
  });

  it("computes bar geometry correctly", () => {
    const pt = mockPretext();
    const tasks: Task[] = [
      {
        id: "1",
        label: "Task",
        start: new Date("2026-01-01"),
        end: new Date("2026-01-31"),
        progress: 0.5,
      },
    ];

    const { bars } = computeLayout(
      tasks,
      { tasks, font: "sans-serif" },
      pt,
      1000,
    );

    expect(bars[0].progress).toBe(0.5);
    expect(bars[0].width).toBeGreaterThan(0);
    expect(bars[0].y).toBe(48); // headerHeight default
  });

  it("clamps progress to 0-1", () => {
    const pt = mockPretext();
    const tasks: Task[] = [
      { id: "1", label: "A", start: new Date("2026-01-01"), end: new Date("2026-01-10"), progress: 1.5 },
      { id: "2", label: "B", start: new Date("2026-01-01"), end: new Date("2026-01-10"), progress: -0.5 },
    ];

    const { bars } = computeLayout(tasks, { tasks, font: "sans-serif" }, pt, 800);
    expect(bars[0].progress).toBe(1);
    expect(bars[1].progress).toBe(0);
  });
});
