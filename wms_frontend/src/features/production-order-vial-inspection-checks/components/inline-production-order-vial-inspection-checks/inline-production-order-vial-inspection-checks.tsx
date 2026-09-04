import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderVialInspectionCheck } from "../../types";
import { formatDateTime, formatInteger, getUserLabel } from "../../utils";

type SummableVialInspectionCheckKey =
  | "bag_number"
  | "fiber_vial_count"
  | "particulate_count"
  | "damaged_count"
  | "other_defect_count";

const toNumber = (value: string | number | null | undefined) => {
  const numberValue = Number(value ?? 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const sumBy = (
  data: ProductionOrderVialInspectionCheck[],
  key: SummableVialInspectionCheckKey,
) => data.reduce((total, item) => total + toNumber(item[key]), 0);

const joinNotes = (data: ProductionOrderVialInspectionCheck[]) =>
  data
    .map((item) => item.note?.trim())
    .filter(Boolean)
    .join("; ");

function ProductionOrderVialInspectionChecksSkeleton() {
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

function VialInspectionSummary({
  data,
  productionOrderId,
  selectedSummaryId,
  onSelectSummary,
}: {
  data: ProductionOrderVialInspectionCheck[];
  productionOrderId?: string | number | null;
  selectedSummaryId?: string | number | null;
  onSelectSummary?: (productionOrderId: string | number) => void;
}) {
  const totalBagNumber = sumBy(data, "bag_number");
  const totalFiberVialCount = sumBy(data, "fiber_vial_count");
  const totalParticulateCount = sumBy(data, "particulate_count");
  const totalDamagedCount = sumBy(data, "damaged_count");
  const totalOtherDefectCount = sumBy(data, "other_defect_count");
  const totalNote = joinNotes(data);
  const hasSummaryId =
    productionOrderId !== null && productionOrderId !== undefined;
  const isSelectable = Boolean(hasSummaryId && onSelectSummary);
  const isSelected =
    selectedSummaryId !== null &&
    selectedSummaryId !== undefined &&
    hasSummaryId &&
    String(selectedSummaryId) === String(productionOrderId);

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Tổng kết soi lọ</h2>
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
              <TableHead className="border-r">Phạm vi</TableHead>
              <TableHead className="border-r text-right">Bao số</TableHead>
              <TableHead className="border-r text-right">Lọ có sợi</TableHead>
              <TableHead className="border-r text-right">Vẩn</TableHead>
              <TableHead className="border-r text-right">Hỏng</TableHead>
              <TableHead className="border-r text-right">Lỗi khác</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              tabIndex={isSelectable ? 0 : undefined}
              aria-selected={isSelected}
              data-state={isSelected ? "selected" : undefined}
              className={isSelectable ? "cursor-pointer" : undefined}
              onClick={() => {
                if (
                  productionOrderId !== null &&
                  productionOrderId !== undefined
                ) {
                  onSelectSummary?.(productionOrderId);
                }
              }}
              onKeyDown={(event) => {
                if (
                  !isSelectable ||
                  productionOrderId === null ||
                  productionOrderId === undefined
                ) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSummary?.(productionOrderId);
                }
              }}
            >
              <TableCell className="whitespace-nowrap border-r font-medium">
                Toàn lô
              </TableCell>
              <TableCell className="border-r text-right font-medium">
                {formatInteger(totalBagNumber)}
              </TableCell>
              <TableCell className="border-r text-right font-medium">
                {formatInteger(totalFiberVialCount)}
              </TableCell>
              <TableCell className="border-r text-right font-medium">
                {formatInteger(totalParticulateCount)}
              </TableCell>
              <TableCell className="border-r text-right font-medium">
                {formatInteger(totalDamagedCount)}
              </TableCell>
              <TableCell className="border-r text-right font-medium">
                {formatInteger(totalOtherDefectCount)}
              </TableCell>
              <TableCell className="max-w-56 whitespace-normal break-words">
                {totalNote}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function InlineProductionOrderVialInspectionChecks({
  data,
  productionOrderId,
  selectedCheckId,
  selectedSummaryId,
  onSelectCheck,
  onSelectSummary,
}: {
  data: ProductionOrderVialInspectionCheck[] | undefined;
  productionOrderId?: string | number | null;
  selectedCheckId?: string | number | null;
  selectedSummaryId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
  onSelectSummary?: (productionOrderId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderVialInspectionChecksSkeleton />;
  }

  return (
    <>
      <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Soi lọ</h2>
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
                <TableHead className="border-r text-right">Bao số</TableHead>
                <TableHead className="border-r text-right">Lọ có sợi</TableHead>
                <TableHead className="border-r text-right">Vẩn</TableHead>
                <TableHead className="border-r text-right">Hỏng</TableHead>
                <TableHead className="border-r text-right">Lỗi khác</TableHead>
                <TableHead className="border-r">Ghi chú</TableHead>
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
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatInteger(item.bag_number)}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatInteger(item.fiber_vial_count)}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatInteger(item.particulate_count)}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatInteger(item.damaged_count)}
                    </TableCell>
                    <TableCell className="border-r text-right">
                      {formatInteger(item.other_defect_count)}
                    </TableCell>
                    <TableCell className="max-w-56 border-r whitespace-normal break-words">
                      {item.note ?? ""}
                    </TableCell>
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

      <VialInspectionSummary
        data={data}
        productionOrderId={productionOrderId}
        selectedSummaryId={selectedSummaryId}
        onSelectSummary={onSelectSummary}
      />
    </>
  );
}
