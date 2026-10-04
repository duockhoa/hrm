import type { buildDeviationHeatmap } from "./deviation-report";

type Heatmap = ReturnType<typeof buildDeviationHeatmap>;
type Week = Heatmap["weeks"][number];

export function getDeviationHeatmapLayout(heatmap: Heatmap, width: number) {
  // Keep the initial server/client render identical until the container is measured.
  const viewportWidth = Number.isFinite(width) && width > 0 ? width : 640;
  const dayCount = heatmap.weeks.reduce((total, week) => total + week.days.filter((day) => day !== null).length, 0);
  const daily = dayCount > 0 && dayCount <= 14;
  // Calendar dates and counts need at least 44px each. Narrow panels use week columns.
  const calendar = !daily && heatmap.weeks.length <= 6 && viewportWidth >= 7 * 44 + 6 * 6;
  const mode = daily ? "days" as const : calendar ? "calendar" as const : "timeline" as const;
  const gap = daily ? 8 : calendar ? 6 : 4;
  const labelWidth = mode === "timeline" ? 36 : 0;
  const minCellWidth = daily ? 64 : calendar ? 44 : 14;
  const availableWidth = Math.max(0, viewportWidth - labelWidth);
  const capacity = Math.max(1, Math.floor((availableWidth + gap) / (minCellWidth + gap)));
  const sections: { key: string; weeks: Week[]; from: string; to: string }[] = [];

  for (const week of heatmap.weeks) {
    const days = week.days.filter((day) => day !== null);
    if (!days.length) continue;
    const from = days[0].day;
    const to = days[days.length - 1].day;
    const last = sections.at(-1);
    // A shared week at New Year stays intact; no day is repeated or omitted.
    if (last && (mode !== "timeline" || (last.weeks.length < capacity && last.from.slice(0, 4) === from.slice(0, 4)))) {
      last.weeks.push(week);
      last.to = to;
    } else {
      sections.push({ key: week.key, weeks: [week], from, to });
    }
  }

  // Short final sections keep the same column size as the rest of the range.
  const columnCount = daily
    ? Math.min(dayCount, capacity)
    : calendar ? 7 : Math.max(1, ...sections.map((section) => section.weeks.length));
  const cellWidth = Math.max(minCellWidth, (availableWidth - (columnCount - 1) * gap) / columnCount);
  const cellHeight = daily
    ? Math.max(68, Math.min(92, Math.round(cellWidth * 0.6)))
    : calendar
    ? Math.max(48, Math.min(84, Math.round(cellWidth * 0.55)))
    : Math.max(14, Math.min(36, Math.floor(cellWidth)));

  return {
    mode,
    sections,
    columnCount,
    gap,
    labelWidth,
    cellWidth,
    cellHeight,
    minWidth: labelWidth + columnCount * minCellWidth + (columnCount - 1) * gap,
  };
}

export function getDeviationHeatmapMonthLabels(weeks: Week[], columnCount: number) {
  const labels: { key: string; months: string[]; column: number; span: number }[] = [];
  let previousMonth = "";
  weeks.forEach((week, column) => {
    for (const day of week.days) {
      if (!day) continue;
      const month = day.day.slice(0, 7);
      if (month === previousMonth) continue;
      const last = labels.at(-1);
      if (last?.column === column) {
        last.months.push(month);
      } else {
        labels.push({ key: month, months: [month], column, span: 1 });
      }
      previousMonth = month;
    }
  });
  return labels.map((label, index) => ({
    ...label,
    span: (labels[index + 1]?.column ?? columnCount) - label.column,
  }));
}

export function getDeviationHeatmapLegend(maxCount: number) {
  const bins = [{ level: 0, label: "0" }];
  for (let level = 1; level <= 4; level += 1) {
    const from = Math.floor(((level - 1) * maxCount) / 4) + 1;
    const to = Math.floor((level * maxCount) / 4);
    if (from <= to) bins.push({ level, label: from === to ? String(from) : `${from}–${to}` });
  }
  return bins;
}
