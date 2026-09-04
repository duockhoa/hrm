import { Images } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderPreSecondaryPackagingCheck } from "../types";
import { formatDateTime, formatQuantity, getUserLabel } from "../utils";

export default function InlinePreSecondaryPackagingChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderPreSecondaryPackagingCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (id: string | number) => void;
}) {
  if (!data) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <Skeleton className="h-7 w-80" />
        <Skeleton className="mt-4 h-36 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Kiểm tra BTP trước đóng gói bao bì cấp 2
        </h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>
      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có bản ghi kiểm tra bán thành phẩm trước đóng gói.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-r">Thời điểm</TableHead>
                <TableHead className="min-w-64 border-r">Yêu cầu</TableHead>
                <TableHead className="border-r text-right">SL kiểm tra</TableHead>
                <TableHead className="border-r text-right">SL đạt</TableHead>
                <TableHead className="border-r text-center">Ảnh</TableHead>
                <TableHead>Người tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const selected = String(selectedCheckId) === String(item.id);
                return (
                  <TableRow
                    key={item.id}
                    tabIndex={onSelectCheck ? 0 : undefined}
                    aria-selected={selected}
                    data-state={selected ? "selected" : undefined}
                    className={onSelectCheck ? "cursor-pointer" : undefined}
                    onClick={() => onSelectCheck?.(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectCheck?.(item.id);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap border-r">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal break-words border-r">
                      {item.requirement || "—"}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatQuantity(item.quantity_checked)}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatQuantity(item.quantity_passed)}
                    </TableCell>
                    <TableCell className="border-r text-center">
                      <span className="inline-flex items-center gap-1">
                        <Images className="size-4" /> {item.images?.length ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>{getUserLabel(item.createdBy)}</TableCell>
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
