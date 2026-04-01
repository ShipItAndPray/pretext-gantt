# @shipitandpray/pretext-gantt

Zero-flicker Gantt chart renderer. Task labels are measured and placed correctly on frame 1 using [@chenglou/pretext](https://github.com/chenglou/pretext) -- no layout shifts, no flicker, no reflow.

**[Live Demo](https://shipitandpray.github.io/pretext-gantt/)**

## Why

Every Gantt chart library renders first, then measures text, then repositions labels -- causing visible flicker. This library uses Pretext to pre-measure all label widths as pure arithmetic *before* the first paint. The result: labels appear in the correct position on frame 1.

## Install

```bash
npm install @shipitandpray/pretext-gantt @chenglou/pretext
```

## Usage

```typescript
import { createGantt } from "@shipitandpray/pretext-gantt";
import * as pretext from "@chenglou/pretext";

const chart = createGantt(
  document.getElementById("gantt")!,
  {
    tasks: [
      { id: "1", label: "Design", start: new Date("2026-01-01"), end: new Date("2026-01-15"), progress: 1.0 },
      { id: "2", label: "Develop", start: new Date("2026-01-10"), end: new Date("2026-02-01"), progress: 0.5, dependencies: ["1"] },
      { id: "3", label: "Test", start: new Date("2026-02-01"), end: new Date("2026-02-15"), dependencies: ["2"] },
    ],
    font: "Inter, sans-serif",
    barHeight: 32,
    rowGap: 8,
  },
  pretext,
);

// Update later
chart.setTasks(newTasks);
chart.render();

// Clean up
chart.destroy();
```

## Label Placement Algorithm

For each task bar, before any paint:

1. **Measure** label width via `pretext.prepare()` + `pretext.layout()`
2. **Compare** to bar pixel width
3. **Decide**:
   - Label fits inside bar -> render inside (white text)
   - Label doesn't fit -> render outside right (gray text)
   - No room outside -> truncate with ellipsis
   - Still no room -> hide entirely
4. All decisions are pure arithmetic. **Zero DOM queries.**

## API

### `createGantt(container, options, pretext)`

Creates and renders a Gantt chart. Returns a `GanttChart` instance.

### `GanttChart`

| Method | Description |
|--------|-------------|
| `setTasks(tasks)` | Replace tasks and re-render |
| `setTimeRange(start, end)` | Override visible date range |
| `setWidth(width)` | Set chart width (re-layouts without re-measuring) |
| `render()` | Full re-render |
| `destroy()` | Remove canvas and clean up |

### `Task`

```typescript
interface Task {
  id: string;
  label: string;
  start: Date;
  end: Date;
  color?: string;       // hex color, auto-assigned if omitted
  progress?: number;     // 0-1
  dependencies?: string[]; // task IDs this depends on
}
```

### `GanttOptions`

```typescript
interface GanttOptions {
  tasks: Task[];
  font: string;           // CSS font family
  barHeight?: number;      // default: 32
  rowGap?: number;         // default: 8
  timeRange?: { start: Date; end: Date };
  showDependencies?: boolean; // default: true
  headerHeight?: number;   // default: 48
  padding?: number;        // default: 8
}
```

## Features

- Zero layout shift -- labels positioned before first paint
- Canvas rendering -- fast, no DOM reflow
- HiDPI/Retina support
- Dependency arrows between tasks
- Progress bars on tasks
- Auto time range from task dates
- Color palette with auto-assignment
- Today marker line
- Responsive -- call `render()` on resize

## License

MIT
