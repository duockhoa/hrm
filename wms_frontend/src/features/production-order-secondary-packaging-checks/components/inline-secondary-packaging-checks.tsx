import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderSecondaryPackagingCheck } from "../types";
import { formatDateTime, formatQuantity, getUserLabel } from "../utils";

function InlineSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3"><Skeleton className="h-6 w-64" /><Skeleton className="h-7 w-10 rounded-full" /></div>
      <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
    </div>
  );
}

export default function InlineProductionOrderSecondaryPackagingChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderSecondaryPackagingCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (!data) return <InlineSkeleton />;

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Kiểm tra đóng gói bao bì cấp 2</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">{data.length}</span>
      </div>
      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">Chưa có hạng mục kiểm tra bao bì cấp 2.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-r">Thời điểm</TableHead>
                <TableHead className="border-r">Công đoạn</TableHead>
                <TableHead className="border-r text-right">SL kiểm tra</TableHead>
                <TableHead className="border-r text-right">SL đạt</TableHead>
                <TableHead>Người kiểm tra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const checkId = item.id;
                const selectable = checkId !== null && checkId !== undefined;
                const selected = selectedCheckId !== null && selectedCheckId !== undefined && selectable && String(selectedCheckId) === String(checkId);
                return (
                  <TableRow
                    key={item.id ?? index}
                    tabIndex={selectable && onSelectCheck ? 0 : undefined}
                    aria-selected={selected}
                    data-state={selected ? "selected" : undefined}
                    className={selectable && onSelectCheck ? "cursor-pointer" : undefined}
                    onClick={() => selectable && onSelectCheck?.(checkId)}
                    onKeyDown={(event) => {
                      if (!selectable || !onSelectCheck) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectCheck(checkId);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap border-r">{formatDateTime(item.created_at)}</TableCell>
                    <TableCell className="max-w-48 whitespace-normal break-words border-r">{item.stage || "—"}</TableCell>
                    <TableCell className="border-r text-right">{formatQuantity(item.quantity_checked)}</TableCell>
                    <TableCell className="border-r text-right">{formatQuantity(item.quantity_passed)}</TableCell>
                    <TableCell className="max-w-44 whitespace-normal break-words">{getUserLabel(item.checkedBy ?? item.createdBy)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
