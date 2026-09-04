import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderDateCheck } from "../../types";
import {
  formatApprovalStatus,
  formatDateTime,
  formatPackageType,
  getFileNameFromPath,
  getUserLabel,
} from "../../utils";

const getStatusClassName = (status: string | null | undefined) => {
  if (status === "approved") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

function ProductionOrderDateChecksSkeleton({ compact }: { compact: boolean }) {
  return (
    <div
      className={
        compact
          ? "w-full space-y-3"
          : "w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md"
      }
    >
      {!compact ? (
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-7 w-10 rounded-full" />
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function InlineProductionOrderDateChecks({
  compact = false,
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  compact?: boolean;
  data: ProductionOrderDateCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderDateChecksSkeleton compact={compact} />;
  }

  return (
    <div
      className={
        compact
          ? "w-full min-w-0 overflow-hidden"
          : "w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md"
      }
    >
      {!compact ? (
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Kiểm tra date</h2>
          <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
            {data.length}
          </span>
        </div>
      ) : null}

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          chưa có dữ liệu
        </div>
      ) : (
        <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead className="border-r">Loại bao bì</TableHead>
              <TableHead className="border-r">Trạng thái</TableHead>
              <TableHead className="border-r">File yêu cầu</TableHead>
              <TableHead className="border-r text-right">Ảnh</TableHead>
              <TableHead>Người nhập</TableHead>
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
                    {formatDateTime(item.checked_at)}
                  </TableCell>
                  <TableCell className="border-r">
                    {formatPackageType(item.package_type)}
                  </TableCell>
                  <TableCell className="border-r">
                    <Badge
                      variant="outline"
                      className={getStatusClassName(item.approval_status)}
                    >
                      {formatApprovalStatus(item.approval_status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48 whitespace-normal break-words border-r">
                    {item.request_file_path
                      ? getFileNameFromPath(item.request_file_path)
                      : "Không có"}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {item.images?.length ?? 0}
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
