import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderMaterialProcessSummary } from "../../types";

type SummaryData =
  | ProductionOrderMaterialProcessSummary[]
  | ProductionOrderMaterialProcessSummary
  | null
  | undefined;

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatQuantity = (
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
) => {
  if (quantity === null || quantity === undefined || quantity === "") {
    return "—";
  }

  const numericValue = Number(quantity);
  const value = Number.isNaN(numericValue)
    ? String(quantity)
    : numericValue.toLocaleString("vi-VN");
  return `${value} ${unit || "kg"}`;
};

const getUserLabel = (
  user: ProductionOrderMaterialProcessSummary["createdBy"],
) => user?.name || user?.username || user?.email || "—";

const normalizeSummaries = (data: SummaryData) =>
  !data ? [] : Array.isArray(data) ? data : [data];

export default function InlineProductionOrderMaterialProcessSummaries({
  data,
  selectedSummaryId,
  onSelectSummary,
}: {
  data: SummaryData;
  selectedSummaryId?: string | number | null;
  onSelectSummary?: (summaryId: string | number) => void;
}) {
  if (data === undefined) {
    return <Skeleton className="h-52 w-full max-w-4xl" />;
  }

  const summaries = normalizeSummaries(data);

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Tổng kết quá trình nguyên liệu</h2>
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
              <TableHead className="border-r text-right">Khối lượng</TableHead>
              <TableHead className="border-r text-right">Hàm ẩm</TableHead>
              <TableHead className="border-r">Ghi chú</TableHead>
              <TableHead>Người nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((summary, index) => {
              const summaryId = summary.id;
              const isSelectable =
                summaryId !== null &&
                summaryId !== undefined &&
                Boolean(onSelectSummary);
              const isSelected =
                selectedSummaryId !== null &&
                selectedSummaryId !== undefined &&
                String(selectedSummaryId) === String(summaryId);

              return (
                <TableRow
                  key={summaryId ?? index}
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
                    {summary.process_stage || "—"}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatQuantity(summary.yielded_quantity, summary.yielded_unit)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {summary.moisture_percent === null ||
                    summary.moisture_percent === undefined ||
                    summary.moisture_percent === ""
                      ? "—"
                      : `${summary.moisture_percent}%`}
                  </TableCell>
                  <TableCell className="max-w-52 border-r whitespace-normal break-words">
                    {summary.note || "—"}
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
