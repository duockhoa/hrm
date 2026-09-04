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
  createProductionOrderLineDetailId,
  formatDate,
  formatNumber,
  getProductionOrderLineStage,
  getProductionOrderLineUnit,
  type ProductionOrderLine,
} from "../../utils";

function ProductionOrderLinesSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-64" />
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

export default function InlineProductionOrderLines({
  data,
  productionOrderId,
  selectedLineId,
  onSelectLine,
}: {
  data: ProductionOrderLine[] | undefined;
  productionOrderId?: string | number | null;
  selectedLineId?: string | number | null;
  onSelectLine?: (lineId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderLinesSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Thông tin dòng lệnh sản xuất</h2>
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
              <TableHead className="w-14 border-r text-center">STT</TableHead>
              <TableHead className="border-r">Giai đoạn</TableHead>
              <TableHead className="border-r">Mã hàng</TableHead>
              <TableHead className="border-r">Tên hàng</TableHead>
              <TableHead className="border-r">Số lô</TableHead>
              <TableHead className="border-r">Hạn dùng</TableHead>
              <TableHead className="border-r">Kho</TableHead>
              <TableHead className="border-r text-right">Yêu cầu</TableHead>
              <TableHead className="border-r text-right">Đã xuất</TableHead>
              <TableHead>ĐVT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((line, index) => {
              const lineId =
                productionOrderId !== null && productionOrderId !== undefined
                  ? createProductionOrderLineDetailId(productionOrderId, index)
                  : undefined;
              const isSelectable = Boolean(lineId && onSelectLine);
              const isSelected =
                selectedLineId !== null &&
                selectedLineId !== undefined &&
                lineId !== undefined &&
                String(selectedLineId) === String(lineId);

              return (
                <TableRow
                  key={`${line.LineNumber ?? index}-${line.ItemNo ?? ""}`}
                  tabIndex={isSelectable ? 0 : undefined}
                  aria-selected={isSelected}
                  data-state={isSelected ? "selected" : undefined}
                  className={isSelectable ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (lineId !== undefined) {
                      onSelectLine?.(lineId);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (lineId === undefined || !isSelectable) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectLine?.(lineId);
                    }
                  }}
                >
                  <TableCell className="border-r text-center">
                    {index + 1}
                  </TableCell>
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
                  <TableCell className="border-r">
                    {formatDate(line.U_HSD)}
                  </TableCell>
                  <TableCell className="border-r">{line.Warehouse}</TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(line.PlannedQuantity)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(line.IssuedQuantity)}
                  </TableCell>
                  <TableCell>{getProductionOrderLineUnit(line)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
