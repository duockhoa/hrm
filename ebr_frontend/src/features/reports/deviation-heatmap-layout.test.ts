import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDeviationHeatmap } from "./deviation-report";
import {
  getDeviationHeatmapLayout,
  getDeviationHeatmapLegend,
  getDeviationHeatmapMonthLabels,
} from "./deviation-heatmap-layout";

test("monthly ranges switch between calendar and week columns as the container resizes", () => {
  const heatmap = buildDeviationHeatmap(["2026-09-01"], { from: "2026-09-01", to: "2026-09-30" });
  const narrow = getDeviationHeatmapLayout(heatmap, 384);
  const wide = getDeviationHeatmapLayout(heatmap, 2000);
  assert.equal(narrow.mode, "calendar");
  assert.equal(wide.mode, "calendar");
  assert.equal(narrow.columnCount, 7);
  assert.equal(narrow.cellHeight, 48);
  assert.equal(wide.cellHeight, 84);
  assert.ok(narrow.minWidth <= 384);
  assert.ok(wide.cellWidth > narrow.cellWidth);
  assert.equal(wide.sections.length, 1);
  assert.equal(wide.sections[0].weeks.length, heatmap.weeks.length);
  const compact = getDeviationHeatmapLayout(heatmap, 280);
  assert.equal(compact.mode, "timeline");
  assert.equal(compact.sections.length, 1);
  assert.ok(compact.minWidth <= 280);
  assert.ok(compact.cellWidth >= 30);
});

test("one to fourteen days use only actual days and wrap readable cards to container width", () => {
  for (const to of ["2026-09-01", "2026-09-07", "2026-09-14"]) {
    const heatmap = buildDeviationHeatmap([], { from: "2026-09-01", to });
    const dayCount = Number(to.slice(8));
    for (const width of [240, 280, 384, 768, 2000]) {
      const layout = getDeviationHeatmapLayout(heatmap, width);
      assert.equal(layout.mode, "days");
      assert.ok(layout.columnCount > 0 && layout.columnCount <= dayCount);
      assert.ok(layout.minWidth <= width);
      assert.ok(layout.cellWidth >= 64);
      assert.ok(layout.cellHeight >= 68 && layout.cellHeight <= 92);
    }
    const wide = getDeviationHeatmapLayout(heatmap, 2000);
    assert.equal(wide.columnCount, dayCount);
  }
  const twoWeeks = buildDeviationHeatmap([], { from: "2026-09-01", to: "2026-09-14" });
  assert.ok(getDeviationHeatmapLayout(twoWeeks, 280).columnCount < 14);
  assert.deepEqual(getDeviationHeatmapLayout(twoWeeks, 0), getDeviationHeatmapLayout(twoWeeks, 640));
});

test("long ranges wrap to container width while retaining every date and count", () => {
  const heatmap = buildDeviationHeatmap(
    ["2026-01-01", "2026-01-01", "2026-06-02", "2026-12-31"],
    { from: "2026-01-01", to: "2026-12-31" },
  );
  const original = heatmap.weeks.flatMap((week) => week.days).filter((day) => day !== null);
  for (const width of [240, 280, 480, 768, 1200, 2000]) {
    const layout = getDeviationHeatmapLayout(heatmap, width);
    assert.equal(layout.mode, "timeline");
    assert.ok(layout.minWidth <= width);
    assert.ok(layout.cellWidth >= 14);
    assert.ok(layout.cellHeight >= 14 && layout.cellHeight <= 36);
    assert.ok(layout.labelWidth + layout.columnCount * layout.cellWidth + (layout.columnCount - 1) * layout.gap <= width + 0.001);
    assert.deepEqual(layout.sections.flatMap((section) => section.weeks.flatMap((week) => week.days)).filter((day) => day !== null), original);
  }
  assert.ok(getDeviationHeatmapLayout(heatmap, 280).sections.length > 1);
  assert.equal(getDeviationHeatmapLayout(heatmap, 2000).sections.length, 1);
  const narrow = getDeviationHeatmapLayout(heatmap, 280);
  assert.ok(narrow.sections.at(-1)!.weeks.length < narrow.columnCount);
});

test("multiple years keep shared weeks intact, including leap days", () => {
  const heatmap = buildDeviationHeatmap([], { from: "2023-12-28", to: "2025-01-03" });
  const layout = getDeviationHeatmapLayout(heatmap, 2000);
  assert.equal(layout.sections.length, 2);
  const days = layout.sections.flatMap((section) => section.weeks.flatMap((week) => week.days)).filter((day) => day !== null);
  assert.equal(days.length, 373);
  assert.equal(new Set(days.map((day) => day.day)).size, days.length);
  assert.ok(days.some((day) => day.day === "2024-02-29"));
  assert.equal(days[0].day, "2023-12-28");
  assert.equal(days.at(-1)?.day, "2025-01-03");
});

test("month labels retain both months when a week crosses a boundary", () => {
  const heatmap = buildDeviationHeatmap([], { from: "2026-12-31", to: "2027-01-02" });
  const labels = getDeviationHeatmapMonthLabels(heatmap.weeks, 1);
  assert.deepEqual(labels, [{ key: "2026-12", months: ["2026-12", "2027-01"], column: 0, span: 1 }]);
  const long = buildDeviationHeatmap([], { from: "2026-01-01", to: "2026-12-31" });
  for (const section of getDeviationHeatmapLayout(long, 280).sections) {
    const months = getDeviationHeatmapMonthLabels(section.weeks, 13);
    assert.ok(months.length > 0);
    assert.equal(months[0].column, 0);
    assert.ok(months.every((month) => month.span > 0 && month.column + month.span <= 13));
  }
});

test("legend ranges match the heatmap's color level for all possible counts", () => {
  assert.deepEqual(getDeviationHeatmapLegend(0), [{ level: 0, label: "0" }]);
  assert.deepEqual(getDeviationHeatmapLegend(1), [{ level: 0, label: "0" }, { level: 4, label: "1" }]);
  for (const maxCount of [2, 3, 4, 5, 10, 81]) {
    const bins = getDeviationHeatmapLegend(maxCount);
    for (let count = 1; count <= maxCount; count += 1) {
      const bin = bins.find((candidate) => {
        const [from, to = from] = candidate.label.split("–").map(Number);
        return count >= from && count <= to;
      });
      assert.equal(bin?.level, Math.ceil((count / maxCount) * 4));
    }
  }
});
