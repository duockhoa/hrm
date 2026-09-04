import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderTenShellWeightCheck } from "../../types";
import { formatDateTime, formatWeight, getUserLabel } from "../../utils";

function ProductionOrderTenShellWeightCheckSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-7 w-10 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export default function InlineProductionOrderTenShellWeightCheck({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderTenShellWeightCheck | null | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (data === undefined) {
    return <ProductionOrderTenShellWeightCheckSkeleton />;
  }

  const checkId = data?.id;
  const hasCheckId = checkId !== null && checkId !== undefined;
  const isSelectable = Boolean(hasCheckId && onSelectCheck);
  const isSelected =
    selectedCheckId !== null &&
    selectedCheckId !== undefined &&
    hasCheckId &&
    String(selectedCheckId) === String(checkId);

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Khối lượng 10 vỏ</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data ? 1 : 0}
        </span>
      </div>

      {!data ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          chưa có dữ liệu
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead className="border-r text-right">
                Khối lượng 10 vỏ (mg)
              </TableHead>
              <TableHead>Người nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              tabIndex={isSelectable ? 0 : undefined}
              aria-selected={isSelected}
              data-state={isSelected ? "selected" : undefined}
              className={isSelectable ? "cursor-pointer" : undefined}
              onClick={() => {
                if (checkId !== null && checkId !== undefined) {
                  onSelectCheck?.(checkId);
                }
              }}
              onKeyDown={(event) => {
                if (checkId === null || checkId === undefined || !isSelectable) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectCheck?.(checkId);
                }
              }}
            >
              <TableCell className="whitespace-nowrap border-r">
                {formatDateTime(data.updated_at ?? data.created_at)}
              </TableCell>
              <TableCell className="border-r text-right font-medium">
                {formatWeight(data.ten_shells_weight)}
              </TableCell>
              <TableCell className="max-w-44 whitespace-normal break-words">
                {getUserLabel(data.createdBy)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}
