"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { buildDeviationHeatmap } from "../deviation-report";
import {
  getDeviationHeatmapLayout,
  getDeviationHeatmapLegend,
  getDeviationHeatmapMonthLabels,
} from "../deviation-heatmap-layout";

const COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dayLabel = (day: string) => day.split("-").reverse().join("/");
const number = (value: number) => value.toLocaleString("vi-VN");
type Heatmap = ReturnType<typeof buildDeviationHeatmap>;
type Day = NonNullable<Heatmap["weeks"][number]["days"][number]>;

export default function DeviationCalendarHeatmap({ heatmap }: { heatmap: Heatmap }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const hasData = Boolean(heatmap.weeks.length && heatmap.from && heatmap.to);
  const layout = useMemo(() => getDeviationHeatmapLayout(heatmap, viewportWidth), [heatmap, viewportWidth]);
  const days = useMemo(
    () => heatmap.weeks.flatMap((week) => week.days).filter((day) => day !== null),
    [heatmap.weeks],
  );
  const activeDays = useMemo(() => days.filter((day) => day.count > 0).length, [days]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [hasData]);

  if (!hasData || !heatmap.from || !heatmap.to) {
    return <p className="py-8 text-center text-sm text-slate-500">Chưa có ngày hợp lệ để hiển thị lịch sai lệch.</p>;
  }

  const daily = layout.mode === "days";
  const calendar = layout.mode === "calendar";
  const detailed = daily || calendar;
  const selectedDay = days.find((day) => day.day === activeDay);
  const focusDay = days.find((day) => day.day === focusedDay)?.day ?? days[0]?.day;
  const columns = `repeat(${layout.columnCount}, minmax(0, 1fr))`;
  const rows = { gridTemplateRows: `repeat(7, ${layout.cellHeight}px)`, rowGap: layout.gap };
  const showDay = detailed || layout.cellWidth >= 30;
  const showCount = detailed || layout.cellWidth >= 72;
  const spansYears = heatmap.from.slice(0, 4) !== heatmap.to.slice(0, 4);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: Day) => {
    const index = days.findIndex((cell) => cell.day === day.day);
    const offsets: Record<string, number> = {
      ArrowLeft: detailed ? -1 : -7,
      ArrowRight: detailed ? 1 : 7,
      ArrowUp: daily ? -layout.columnCount : calendar ? -7 : -1,
      ArrowDown: daily ? layout.columnCount : calendar ? 7 : 1,
    };
    let nextIndex: number;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = days.length - 1;
    else if (event.key in offsets) nextIndex = index + offsets[event.key];
    else return;
    event.preventDefault();
    const next = days[nextIndex];
    if (next) viewportRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next.day}"]`)?.focus();
  };

  const renderDay = (day: Day | null, weekday: number) => {
    if (!day) {
      return <span key={`empty-${weekday}`} aria-hidden="true" className={calendar ? "rounded-md bg-slate-50" : ""} />;
    }
    const label = `${WEEKDAYS[weekday]}, ${dayLabel(day.day)}: ${number(day.count)} phiếu sai lệch`;
    return (
      <button
        key={day.day}
        type="button"
        data-day={day.day}
        aria-label={label}
        title={label}
        tabIndex={day.day === focusDay ? 0 : -1}
        onMouseEnter={() => setActiveDay(day.day)}
        onFocus={() => {
          setFocusedDay(day.day);
          setActiveDay(day.day);
        }}
        onClick={() => {
          setFocusedDay(day.day);
          setActiveDay(day.day);
        }}
        onKeyDown={(event) => handleKeyDown(event, day)}
        className={`flex min-w-0 overflow-hidden border border-black/5 tabular-nums transition-shadow hover:ring-2 hover:ring-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${detailed ? "flex-col items-start justify-between rounded-md p-1.5 text-left" : `items-center rounded ${showCount ? "justify-between px-2" : "justify-center"}`}`}
        style={{ backgroundColor: COLORS[day.level], color: day.level >= 3 ? "#ffffff" : "#14532d" }}
      >
        {showDay && (
          <span aria-hidden="true" className="max-w-full text-[11px] leading-none">
            {daily && <span className="mb-1 block font-medium">{WEEKDAY_LABELS[weekday]}</span>}
            <span className="block truncate">
              {daily || layout.cellWidth >= 64 ? dayLabel(day.day).slice(0, 5) : Number(day.day.slice(8))}
            </span>
          </span>
        )}
        {showCount && (
          <span aria-hidden="true" className={`max-w-full truncate font-semibold leading-none ${detailed ? "self-end text-sm" : "ml-2 text-xs"}`}>
            {number(day.count)}{layout.cellWidth >= 90 ? <span className="ml-1 text-[10px] font-normal">phiếu</span> : null}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-slate-600">
          <strong className="font-semibold text-slate-900">{number(heatmap.total)} phiếu sai lệch</strong>
          {" · "}{dayLabel(heatmap.from)} – {dayLabel(heatmap.to)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span><strong className="font-semibold text-slate-700">{number(activeDays)}/{number(days.length)}</strong> ngày có sai lệch</span>
          <span>Cao nhất <strong className="font-semibold text-slate-700">{number(heatmap.maxCount)}</strong> phiếu/ngày</span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div
          ref={viewportRef}
          role="region"
          aria-label={`Lịch mật độ sai lệch theo ngày, ${daily ? "mỗi ô là một ngày" : calendar ? "mỗi hàng là một tuần" : "mỗi cột là một tuần"}`}
          className="-m-1 overflow-x-auto p-1"
        >
          <div className="space-y-5 text-[11px] text-slate-500" style={{ minWidth: layout.minWidth }}>
            {daily ? (
              <div
                className="grid"
                style={{ gridTemplateColumns: columns, gridAutoRows: `${layout.cellHeight}px`, gap: layout.gap }}
              >
                {days.map((day) => renderDay(day, new Date(`${day.day}T00:00:00Z`).getUTCDay()))}
              </div>
            ) : calendar ? (
              <div>
                <div className="mb-2 grid text-center font-medium" style={{ gridTemplateColumns: columns, gap: layout.gap }}>
                  {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
                </div>
                <div className="grid" style={{ gridTemplateColumns: columns, gridAutoRows: `${layout.cellHeight}px`, gap: layout.gap }}>
                  {heatmap.weeks.flatMap((week) => week.days.map((day, weekday) => (
                    <div key={`${week.key}-${weekday}`} className="grid min-w-0">{renderDay(day, weekday)}</div>
                  )))}
                </div>
              </div>
            ) : layout.sections.map((section) => (
              <div key={section.key}>
                {layout.sections.length > 1 && (
                  <p className="mb-2 font-medium text-slate-600">{dayLabel(section.from)} – {dayLabel(section.to)}</p>
                )}
                <div className="mb-2 grid h-4" style={{ marginLeft: layout.labelWidth, gridTemplateColumns: columns, columnGap: layout.gap }}>
                  {getDeviationHeatmapMonthLabels(section.weeks, layout.columnCount).map((month) => {
                    const label = month.months.map((key) => `T${Number(key.slice(5))}${spansYears ? `/${key.slice(0, 4)}` : ""}`).join(" · ");
                    return (
                      <span
                        key={month.key}
                        title={month.months.map((key) => `Tháng ${Number(key.slice(5))}/${key.slice(0, 4)}`).join(" · ")}
                        className="min-w-0 truncate leading-4"
                        style={{ gridColumn: `${month.column + 1} / span ${month.span}` }}
                      >{label}</span>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <div aria-hidden="true" className="grid w-7 shrink-0" style={rows}>
                    {WEEKDAY_LABELS.map((label) => <span key={label} className="flex items-center">{label}</span>)}
                  </div>
                  <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: columns, columnGap: layout.gap }}>
                    {section.weeks.map((week) => (
                      <div key={week.key} className="grid min-w-0" style={rows}>
                        {week.days.map(renderDay)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <p className="min-w-0">
            {selectedDay ? (
              <>{WEEKDAYS[new Date(`${selectedDay.day}T00:00:00Z`).getUTCDay()]}, {dayLabel(selectedDay.day)} · <strong className="font-semibold text-slate-700">{number(selectedDay.count)} phiếu sai lệch</strong></>
            ) : "Mỗi ô là một ngày. Chạm hoặc di chuột để xem chi tiết."}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label={`Thang màu từ 0 đến ${number(heatmap.maxCount)} phiếu mỗi ngày`}>
            {getDeviationHeatmapLegend(heatmap.maxCount).map((bin) => (
              <span key={bin.level} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-3 rounded-[3px] border border-black/5" style={{ backgroundColor: COLORS[bin.level] }} />
                {bin.label}
              </span>
            ))}
            <span>phiếu/ngày</span>
          </div>
        </div>
      </div>
    </div>
  );
}
