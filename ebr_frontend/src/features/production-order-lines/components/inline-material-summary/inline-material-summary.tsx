import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  findMaterialSummaryForLine,
  formatNumber,
  getProductionOrderLineMaterialCode,
  getProductionOrderLineStage,
  getProductionOrderLineUnit,
  type ProductionOrderLine,
  type ProductionOrderMaterialSummary,
} from "../../utils";

function MaterialSummarySkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-7 w-10 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function InlineMaterialSummary({
  data,
  materialSummaries,
  onSelectLine,
}: {
  data: ProductionOrderLine[] | undefined;
  materialSummaries?: ProductionOrderMaterialSummary[] | undefined;
  onSelectLine?: (line: ProductionOrderLine) => void;
}) {
  if (!data) {
    return <MaterialSummarySkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Thông tin vật liệu</h2>
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
              <TableHead className="border-r">Giai đoạn</TableHead>
              <TableHead className="border-r">Mã hàng</TableHead>
              <TableHead className="border-r">Tên hàng</TableHead>
              <TableHead className="border-r">Số lô</TableHead>
              <TableHead className="border-r text-right">Yêu cầu</TableHead>
              <TableHead className="border-r text-right">Đã nhận</TableHead>
              <TableHead className="border-r text-right">Đã dùng</TableHead>
              <TableHead className="border-r text-right">Hao hụt NCC</TableHead>
              <TableHead className="border-r text-right">Hao hụt SX</TableHead>
              <TableHead className="border-r text-right">Còn lại</TableHead>
              <TableHead className="border-r text-right">Mẫu</TableHead>
              <TableHead>ĐVT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((line, index) => {
              const summary = findMaterialSummaryForLine(
                line,
                materialSummaries,
              );
              const isSelectable = Boolean(
                onSelectLine && getProductionOrderLineMaterialCode(line),
              );

              return (
                <TableRow
                  key={`${line.LineNumber ?? index}-${line.ItemNo ?? ""}`}
                  tabIndex={isSelectable ? 0 : undefined}
                  className={isSelectable ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (isSelectable) {
                      onSelectLine?.(line);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!isSelectable) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectLine?.(line);
                    }
                  }}
                >
                  <TableCell className="border-r">
                    {getProductionOrderLineStage(line)}
                  </TableCell>
                  <TableCell className="border-r font-medium">
                    {line.ItemNo}
                  </TableCell>
                  <TableCell className="max-w-48 whitespace-normal break-words border-r">
                    {line.ItemName}
                  </TableCell>
                  <TableCell className="max-w-36 whitespace-normal break-words border-r">
                    {line.U_SL}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(line.PlannedQuantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary?.received_quantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary?.used_quantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary?.supplier_waste_quantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary?.production_waste_quantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary?.remaining_quantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary?.sample_quantity)}
                  </TableCell>
                  <TableCell>
                    {summary?.unit ?? getProductionOrderLineUnit(line)}
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
