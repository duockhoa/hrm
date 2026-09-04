import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderSemiFinishedProductSummary } from "../../types";
import {
  formatDateTime,
  formatQuantityWithUnit,
  formatText,
  getUserLabel,
} from "../../utils";

type SummaryData =
  | ProductionOrderSemiFinishedProductSummary[]
  | ProductionOrderSemiFinishedProductSummary
  | null
  | undefined;

const normalizeSummaries = (data: SummaryData) => {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : [data];
};

function SemiFinishedProductSummariesSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-64" />
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

export default function InlineProductionOrderSemiFinishedProductSummaries({
  data,
  selectedSummaryId,
  onSelectSummary,
}: {
  data: SummaryData;
  selectedSummaryId?: string | number | null;
  onSelectSummary?: (summaryId: string | number) => void;
}) {
  if (data === undefined) {
    return <SemiFinishedProductSummariesSkeleton />;
  }

  const summaries = normalizeSummaries(data);

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Tổng kết sản lượng bán thành phẩm</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {summaries.length}
        </span>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có dữ liệu
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead className="border-r">Giai đoạn</TableHead>
              <TableHead className="border-r text-right">Đầu vào</TableHead>
              <TableHead className="border-r text-right">Đã đóng</TableHead>
              <TableHead className="border-r text-right">Còn lại</TableHead>
              <TableHead className="border-r text-right">Hao hụt</TableHead>
              <TableHead className="border-r text-right">
                Số tải / sọt lọ
              </TableHead>
              <TableHead>Người nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((summary, index) => {
              const summaryId = summary.id;
              const hasSummaryId =
                summaryId !== null && summaryId !== undefined;
              const isSelectable = Boolean(hasSummaryId && onSelectSummary);
              const isSelected =
                selectedSummaryId !== null &&
                selectedSummaryId !== undefined &&
                hasSummaryId &&
                String(selectedSummaryId) === String(summaryId);
              const loadUnit =
                summary.load_quantity === null ||
                summary.load_quantity === undefined ||
                summary.load_quantity === ""
                  ? null
                  : summary.load_unit ?? "tải";

              return (
                <TableRow
                  key={summary.id ?? index}
                  tabIndex={isSelectable ? 0 : undefined}
                  aria-selected={isSelected}
                  data-state={isSelected ? "selected" : undefined}
                  className={isSelectable ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (summaryId !== null && summaryId !== undefined) {
                      onSelectSummary?.(summaryId);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap border-r">
                    {formatDateTime(summary.created_at)}
                  </TableCell>
                  <TableCell className="max-w-36 border-r whitespace-normal break-words">
                    {formatText(summary.stage)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatQuantityWithUnit(summary.input_quantity, summary.input_unit)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatQuantityWithUnit(summary.packed_quantity, summary.packed_unit)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatQuantityWithUnit(summary.leftover_quantity, summary.leftover_unit)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatQuantityWithUnit(summary.waste_quantity, summary.waste_unit)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatQuantityWithUnit(summary.load_quantity, loadUnit)}
                  </TableCell>
                  <TableCell className="max-w-44 whitespace-normal break-words">
                    {getUserLabel(summary.createdBy)}
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
