import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @chenglou/pretext before importing gantt
vi.mock("@chenglou/pretext", () => ({
  prepare: vi.fn(),
  layout: vi.fn((font: string, text: string) => ({
    width: text.length * 8,
    height: 14,
  })),
}));

// We test the layout + utils directly (GanttChart needs DOM + Canvas)
import { resolveTimeRange, decideLabelPlacement, computeLayout } from "../layout.js";
import { dateToX, daysBetween, clamp, colorForIndex, lighten, darken, formatDate, formatMonth } from "../utils.js";
import type { Task } from "../types.js";

describe("utils", () => {
  describe("dateToX", () => {
    it("maps start of range to 0", () => {
      const s = new Date("2026-01-01");
      const e = new Date("2026-02-01");
      expect(dateToX(s, s, e, 1000)).toBe(0);
    });

    it("maps end of range to chartWidth", () => {
      const s = new Date("2026-01-01");
      const e = new Date("2026-02-01");
      expect(dateToX(e, s, e, 1000)).toBe(1000);
    });

    it("maps midpoint to half chartWidth", () => {
      const s = new Date("2026-01-01");
      const e = new Date("2026-01-31");
      const mid = new Date((s.getTime() + e.getTime()) / 2);
      expect(dateToX(mid, s, e, 1000)).toBeCloseTo(500, 0);
    });
  });

  describe("daysBetween", () => {
    it("returns correct days", () => {
      const a = new Date("2026-01-01");
      const b = new Date("2026-01-11");
      expect(daysBetween(a, b)).toBe(10);
    });
  });

  describe("clamp", () => {
    it("clamps to min", () => expect(clamp(-1, 0, 1)).toBe(0));
    it("clamps to max", () => expect(clamp(2, 0, 1)).toBe(1));
    it("passes through", () => expect(clamp(0.5, 0, 1)).toBe(0.5));
  });

  describe("colorForIndex", () => {
    it("returns a color string", () => {
      expect(colorForIndex(0)).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("wraps around palette", () => {
      expect(colorForIndex(0)).toBe(colorForIndex(8));
    });
  });

  describe("lighten / darken", () => {
    it("lighten makes color lighter", () => {
      const original = "#404040";
      const lighter = lighten(original, 0.2);
      const num = parseInt(lighter.replace("#", ""), 16);
      const r = (num >> 16) & 0xff;
      expect(r).toBeGreaterThan(0x40);
    });

    it("darken makes color darker", () => {
      const original = "#808080";
      const darker = darken(original, 0.2);
      const num = parseInt(darker.replace("#", ""), 16);
      const r = (num >> 16) & 0xff;
      expect(r).toBeLessThan(0x80);
    });
  });

  describe("formatDate", () => {
    it("formats as MMM DD", () => {
      expect(formatDate(new Date("2026-03-15"))).toBe("Mar 15");
    });
  });

  describe("formatMonth", () => {
    it("formats as MMM YYYY", () => {
      expect(formatMonth(new Date("2026-03-15"))).toBe("Mar 2026");
    });
  });
});

describe("integration: full layout pipeline", () => {
  const mockPretext = {
    prepare: vi.fn(),
    layout: vi.fn((text: string) => ({ width: text.length * 8, height: 14 })),
  };

  it("handles a realistic project with 5 tasks", () => {
    const tasks: Task[] = [
      { id: "1", label: "Planning", start: new Date("2026-01-01"), end: new Date("2026-01-15"), progress: 1 },
      { id: "2", label: "Design", start: new Date("2026-01-10"), end: new Date("2026-01-25"), progress: 0.8, dependencies: ["1"] },
      { id: "3", label: "Frontend Dev", start: new Date("2026-01-20"), end: new Date("2026-02-15"), progress: 0.3, dependencies: ["2"] },
      { id: "4", label: "Backend Dev", start: new Date("2026-01-20"), end: new Date("2026-02-20"), progress: 0.2, dependencies: ["2"] },
      { id: "5", label: "Testing", start: new Date("2026-02-15"), end: new Date("2026-03-01"), dependencies: ["3", "4"] },
    ];

    const { bars, arrows } = computeLayout(
      tasks,
      { tasks, font: "sans-serif", barHeight: 32, rowGap: 8 },
      mockPretext,
      1200,
    );

    expect(bars).toHaveLength(5);
    // Dependencies: 2->1, 3->2, 4->2, 5->3, 5->4
    expect(arrows).toHaveLength(4);

    // All bars should have positive width
    for (const bar of bars) {
      expect(bar.width).toBeGreaterThan(0);
    }

    // Labels should all be resolved (not undefined)
    for (const bar of bars) {
      expect(bar.label.placement).toBeDefined();
      expect(["inside", "outside", "truncated", "hidden"]).toContain(bar.label.placement);
    }
  });
});
