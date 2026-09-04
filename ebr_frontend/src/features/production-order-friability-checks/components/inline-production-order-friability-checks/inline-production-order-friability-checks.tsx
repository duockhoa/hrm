import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderFriabilityCheck } from "../../types";
import {
  formatDateTime,
  formatDecimal,
  formatPercent,
  getUserLabel,
} from "../../utils";

function ProductionOrderFriabilityChecksSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-7 w-10 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function InlineProductionOrderFriabilityChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderFriabilityCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderFriabilityChecksSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Độ mài mòn</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          chưa có dữ liệu
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="whitespace-nowrap border-r">
                  Thời điểm
                </TableHead>
                <TableHead className="whitespace-nowrap border-r text-right">
                  Trước kiểm tra
                </TableHead>
                <TableHead className="whitespace-nowrap border-r text-right">
                  Sau kiểm tra
                </TableHead>
                <TableHead className="whitespace-nowrap border-r text-right">
                  Độ mài mòn (%)
                </TableHead>
                <TableHead className="whitespace-nowrap">Người nhập</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const checkId = item.id;
                const hasCheckId = checkId !== null && checkId !== undefined;
                const isSelectable = Boolean(hasCheckId && onSelectCheck);
                const isSelected =
                  selectedCheckId !== null &&
                  selectedCheckId !== undefined &&
                  hasCheckId &&
                  String(selectedCheckId) === String(checkId);
                const unit = item.weight_unit ?? "mg";

                return (
                  <TableRow
                    key={item.id ?? index}
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
                      if (
                        checkId === null ||
                        checkId === undefined ||
                        !isSelectable
                      ) {
                        return;
                      }

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectCheck?.(checkId);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap border-r">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap border-r text-right">
                      {formatDecimal(item.total_weight_before_check)} {unit}
                    </TableCell>
                    <TableCell className="whitespace-nowrap border-r text-right">
                      {formatDecimal(item.total_weight_after_check)} {unit}
                    </TableCell>
                    <TableCell className="whitespace-nowrap border-r text-right">
                      {formatPercent(item.friability_percent)}
                    </TableCell>
                    <TableCell className="max-w-44 whitespace-normal break-words">
                      {getUserLabel(item.createdBy)}
                    </TableCell>
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
