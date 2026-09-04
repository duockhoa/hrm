import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionOrderTabletThicknessCheck } from "../../types";
import { TABLET_THICKNESS_KEYS, formatDateTime, formatThicknessWithUnit, getUserLabel } from "../../utils";

export default function InlineProductionOrderTabletThicknessChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderTabletThicknessCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (!data) return <Skeleton className="h-48 w-full max-w-4xl" />;

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Kiểm tra độ dày viên nén</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">{data.length}</span>
      </div>
      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">Chưa có dữ liệu</div>
      ) : (
        <Table className="min-w-[1180px]">
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="border-r">Thời điểm</TableHead>
            {TABLET_THICKNESS_KEYS.map((_, index) => <TableHead key={index} className="border-r text-right">Viên {index + 1}</TableHead>)}
            <TableHead>Người nhập</TableHead>
          </TableRow></TableHeader>
          <TableBody>{data.map((item, index) => {
            const checkId = item.id;
            const selectable = checkId !== null && checkId !== undefined && Boolean(onSelectCheck);
            const selected = selectable && String(selectedCheckId) === String(checkId);
            return <TableRow
              key={item.id ?? index}
              tabIndex={selectable ? 0 : undefined}
              aria-selected={selected}
              data-state={selected ? "selected" : undefined}
              className={selectable ? "cursor-pointer" : undefined}
              onClick={() => checkId !== null && checkId !== undefined && onSelectCheck?.(checkId)}
              onKeyDown={(event) => {
                if (selectable && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelectCheck?.(checkId);
                }
              }}
            >
              <TableCell className="whitespace-nowrap border-r">{formatDateTime(item.created_at)}</TableCell>
              {TABLET_THICKNESS_KEYS.map((key) => <TableCell key={key} className="border-r text-right">{formatThicknessWithUnit(item[key], item.unit)}</TableCell>)}
              <TableCell className="max-w-44 whitespace-normal break-words">{getUserLabel(item.createdBy)}</TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
      )}
    </div>
  );
}
