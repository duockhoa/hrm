import type { buildDeviationHeatmap } from "../deviation-report";

const COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const dayLabel = (day: string) => day.split("-").reverse().join("/");
const number = (value: number) => value.toLocaleString("vi-VN");

export default function DeviationCalendarHeatmap({
  heatmap,
}: {
  heatmap: ReturnType<typeof buildDeviationHeatmap>;
}) {
  if (!heatmap.weeks.length || !heatmap.from || !heatmap.to) {
    return <p className="py-8 text-center text-sm text-slate-500">Chưa có ngày hợp lệ để hiển thị lịch sai lệch.</p>;
  }

  const columns = `repeat(${heatmap.weeks.length}, 11px)`;
  return (
    <div>
      <p className="mb-2 text-sm text-slate-900">
        {number(heatmap.total)} phiếu sai lệch từ {dayLabel(heatmap.from)} đến {dayLabel(heatmap.to)}
      </p>
      <div className="rounded-md border border-slate-200 px-4 pb-3 pt-4">
        <div
          role="region"
          aria-label="Lịch mật độ sai lệch theo ngày, cuộn ngang để xem toàn bộ thời gian"
          tabIndex={0}
          className="overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <div className="w-max pr-3 text-[11px] text-slate-600">
            <div className="mb-1 ml-9 grid h-4 gap-x-1" style={{ gridTemplateColumns: columns }}>
              {heatmap.months.map((month, index) => {
                const nextColumn = heatmap.months[index + 1]?.column ?? heatmap.weeks.length;
                // A short range can contain two months in one week; keep labels on one row.
                if (nextColumn <= month.column) return null;
                return (
                  <span
                    key={month.key}
                    title={`Tháng ${Number(month.key.slice(5))}/${month.key.slice(0, 4)}`}
                    className="whitespace-nowrap leading-4"
                    style={{ gridColumn: `${month.column + 1} / ${nextColumn + 1}`, gridRow: 1 }}
                  >
                    {month.label}
                  </span>
                );
              })}
            </div>
            <div className="flex gap-2">
              <div aria-hidden="true" className="grid w-7 shrink-0 grid-rows-[repeat(7,11px)] gap-y-1">
                {["", "T2", "", "T4", "", "T6", ""].map((label, index) => (
                  <span key={index} className="leading-[11px]">{label}</span>
                ))}
              </div>
              <div className="grid gap-x-1" style={{ gridTemplateColumns: columns }}>
                {heatmap.weeks.map((week) => (
                  <div key={week.key} className="grid grid-rows-[repeat(7,11px)] gap-y-1">
                    {week.days.map((cell, weekday) => {
                      if (!cell) return <span key={weekday} aria-hidden="true" />;
                      const label = `${WEEKDAYS[weekday]}, ${dayLabel(cell.day)}: ${number(cell.count)} phiếu sai lệch`;
                      return (
                        <span
                          key={cell.day}
                          role="img"
                          aria-label={label}
                          title={label}
                          className="size-[11px] rounded-[2px] border border-black/5 hover:outline hover:outline-1 hover:outline-slate-500"
                          style={{ backgroundColor: COLORS[cell.level] }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px] text-slate-500">
          <span>Mỗi ô tương ứng một ngày</span>
          <div className="ml-auto flex items-center gap-1" aria-label={`Thang màu từ 0 đến ${number(heatmap.maxCount)} phiếu mỗi ngày`}>
            <span className="mr-1">Ít</span>
            {COLORS.map((color) => (
              <span key={color} aria-hidden="true" className="size-[11px] rounded-[2px] border border-black/5" style={{ backgroundColor: color }} />
            ))}
            <span className="ml-1">Nhiều</span>
          </div>
        </div>
      </div>
    </div>
  );
}
