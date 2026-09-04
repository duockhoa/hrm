import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderCylinderCalibration } from "../../types";
import {
  formatCalibrationNumber,
  formatDateTime,
  getUserLabel,
} from "../../utils";

function ProductionOrderCylinderCalibrationSkeleton() {
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

export default function InlineProductionOrderCylinderCalibration({
  data,
  onSelect,
}: {
  data: ProductionOrderCylinderCalibration | null | undefined;
  onSelect?: (productionOrderId: string | number) => void;
}) {
  if (data === undefined) {
    return <ProductionOrderCylinderCalibrationSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Hiệu chỉnh ống đong</h2>
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
              <TableHead className="border-r">Mã ống đong</TableHead>
              <TableHead className="border-r text-right">
                Thông số hiệu chỉnh
              </TableHead>
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead>Người nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              tabIndex={onSelect && data.production_order_id ? 0 : undefined}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={() => {
                if (data.production_order_id !== null && data.production_order_id !== undefined) {
                  onSelect?.(data.production_order_id);
                }
              }}
              onKeyDown={(event) => {
                if (
                  (event.key === "Enter" || event.key === " ") &&
                  data.production_order_id !== null &&
                  data.production_order_id !== undefined
                ) {
                  event.preventDefault();
                  onSelect?.(data.production_order_id);
                }
              }}
            >
              <TableCell className="border-r font-medium">
                {data.cylinder_code}
              </TableCell>
              <TableCell className="border-r text-right">
                {formatCalibrationNumber(data.calibration_number)}
              </TableCell>
              <TableCell className="whitespace-nowrap border-r">
                {formatDateTime(data.updated_at ?? data.created_at)}
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
