import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderSamplingRecord } from "../../types";
import { formatDateTime, formatNumber, getUserLabel } from "../../utils";

function ProductionOrderSamplingRecordsSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-24" />
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

export default function InlineProductionOrderSamplingRecords({
  data,
  selectedRecordId,
  onSelectRecord,
}: {
  data: ProductionOrderSamplingRecord[] | undefined;
  selectedRecordId?: string | number | null;
  onSelectRecord?: (recordId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderSamplingRecordsSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Lấy mẫu</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          chưa có dữ liệu
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead className="border-r">Loại mẫu</TableHead>
              <TableHead className="border-r text-right">Số lượng</TableHead>
              <TableHead className="border-r">Đơn vị tính</TableHead>
              <TableHead>Người nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const recordId = item.id;
              const hasRecordId =
                recordId !== null && recordId !== undefined;
              const isSelectable = Boolean(hasRecordId && onSelectRecord);
              const isSelected =
                selectedRecordId !== null &&
                selectedRecordId !== undefined &&
                hasRecordId &&
                String(selectedRecordId) === String(recordId);

              return (
                <TableRow
                  key={item.id ?? index}
                  tabIndex={isSelectable ? 0 : undefined}
                  aria-selected={isSelected}
                  data-state={isSelected ? "selected" : undefined}
                  className={isSelectable ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (recordId !== null && recordId !== undefined) {
                      onSelectRecord?.(recordId);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      recordId === null ||
                      recordId === undefined ||
                      !isSelectable
                    ) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectRecord?.(recordId);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap border-r">
                    {formatDateTime(item.created_at)}
                  </TableCell>
                  <TableCell className="border-r">
                    {item.sampling_type}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(item.quantity)}
                  </TableCell>
                  <TableCell className="border-r">{item.unit}</TableCell>
                  <TableCell className="max-w-44 whitespace-normal break-words">
                    {getUserLabel(item.createdBy)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
