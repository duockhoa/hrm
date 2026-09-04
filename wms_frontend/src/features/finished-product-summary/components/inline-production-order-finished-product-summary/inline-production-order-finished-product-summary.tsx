import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type FinishedProductSummaryUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type ProductionOrderFinishedProductSummary = {
  id?: number | string;
  package_count?: string | number | null;
  boxes_per_package?: string | number | null;
  loose_box_count?: string | number | null;
  note?: string | null;
  total_quantity?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: FinishedProductSummaryUser | null;
};

type FinishedProductSummaryData =
  | ProductionOrderFinishedProductSummary[]
  | ProductionOrderFinishedProductSummary
  | null
  | undefined;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const getUserLabel = (user: FinishedProductSummaryUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

const toNumber = (value: string | number | null | undefined) => {
  const numberValue = Number(value ?? 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const getTotalQuantity = (summary: ProductionOrderFinishedProductSummary) => {
  if (summary.total_quantity !== null && summary.total_quantity !== undefined) {
    return summary.total_quantity;
  }

  return (
    toNumber(summary.package_count) * toNumber(summary.boxes_per_package) +
    toNumber(summary.loose_box_count)
  );
};

const normalizeSummaries = (data: FinishedProductSummaryData) => {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : [data];
};

function FinishedProductSummarySkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-44" />
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

export default function InlineProductionOrderFinishedProductSummary({
  data,
  selectedSummaryId,
  onSelectSummary,
}: {
  data: FinishedProductSummaryData;
  selectedSummaryId?: string | number | null;
  onSelectSummary?: (summaryId: string | number) => void;
}) {
  if (data === undefined) {
    return <FinishedProductSummarySkeleton />;
  }

  const summaries = normalizeSummaries(data);
  const totalBoxCount = summaries.reduce(
    (total, summary) => total + toNumber(getTotalQuantity(summary)),
    0,
  );

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Tổng kết thành phẩm</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {formatNumber(totalBoxCount)}
        </span>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          chưa có dữ liệu
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead className="border-r text-right">Số kiện</TableHead>
              <TableHead className="border-r text-right">
                Số hộp trên kiện
              </TableHead>
              <TableHead className="border-r text-right">Số hộp lẻ</TableHead>
              <TableHead className="border-r text-right">Tổng số lượng</TableHead>
              <TableHead className="border-r">Ghi chú</TableHead>
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
                  onKeyDown={(event) => {
                    if (
                      summaryId === null ||
                      summaryId === undefined ||
                      !isSelectable
                    ) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectSummary?.(summaryId);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap border-r">
                    {formatDateTime(summary.created_at)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary.package_count)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary.boxes_per_package)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(summary.loose_box_count)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(getTotalQuantity(summary))}
                  </TableCell>
                  <TableCell className="max-w-56 border-r whitespace-normal break-words">
                    {summary.note ?? ""}
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
