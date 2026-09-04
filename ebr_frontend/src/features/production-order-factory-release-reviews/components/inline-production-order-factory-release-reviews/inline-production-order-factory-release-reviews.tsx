import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderFactoryReleaseReview } from "../../types";
import { formatDateTime, getUserLabel } from "../../utils";

function FactoryReleaseReviewsSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
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

export default function InlineProductionOrderFactoryReleaseReviews({
  data,
  selectedReviewId,
  onSelectReview,
}: {
  data: ProductionOrderFactoryReleaseReview[] | undefined;
  selectedReviewId?: string | number | null;
  onSelectReview?: (reviewId: string | number) => void;
}) {
  if (!data) {
    return <FactoryReleaseReviewsSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Xét duyệt xuất xưởng</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có dữ liệu
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r">Thời điểm</TableHead>
              <TableHead className="border-r">Số đăng ký/số công bố</TableHead>
              <TableHead className="border-r">Thành phẩm</TableHead>
              <TableHead className="border-r">Sai lệch</TableHead>
              <TableHead>Người duyệt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const reviewId = item.id;
              const hasReviewId = reviewId !== null && reviewId !== undefined;
              const isSelectable = Boolean(hasReviewId && onSelectReview);
              const isSelected =
                selectedReviewId !== null &&
                selectedReviewId !== undefined &&
                hasReviewId &&
                String(selectedReviewId) === String(reviewId);

              return (
                <TableRow
                  key={item.id ?? index}
                  tabIndex={isSelectable ? 0 : undefined}
                  aria-selected={isSelected}
                  data-state={isSelected ? "selected" : undefined}
                  className={isSelectable ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (reviewId !== null && reviewId !== undefined) {
                      onSelectReview?.(reviewId);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      reviewId === null ||
                      reviewId === undefined ||
                      !isSelectable
                    ) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectReview?.(reviewId);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap border-r">
                    {formatDateTime(item.created_at)}
                  </TableCell>
                  <TableCell className="max-w-40 border-r whitespace-normal break-words">
                    {item.registration_number ?? ""}
                  </TableCell>
                  <TableCell className="max-w-40 border-r whitespace-normal break-words">
                    {item.finished_product_test_result ?? ""}
                  </TableCell>
                  <TableCell className="max-w-40 border-r whitespace-normal break-words">
                    {item.deviation ?? ""}
                  </TableCell>
                  <TableCell className="max-w-44 whitespace-normal break-words">
                    {getUserLabel(item.approvedBy ?? item.createdBy)}
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
