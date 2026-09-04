import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderDisinfectantPreparation } from "../../types";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  getUserLabel,
} from "../../utils";

function ProductionOrderDisinfectantPreparationsSkeleton() {
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

export default function InlineProductionOrderDisinfectantPreparations({
  data,
  selectedPreparationId,
  onSelectPreparation,
}: {
  data: ProductionOrderDisinfectantPreparation[] | undefined;
  selectedPreparationId?: string | number | null;
  onSelectPreparation?: (preparationId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderDisinfectantPreparationsSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Pha chế chất sát khuẩn</h2>
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
              <TableHead className="border-r">Chất sát khuẩn</TableHead>
              <TableHead className="border-r text-right">
                Thể tích pha (lít)
              </TableHead>
              <TableHead className="border-r text-right">Nồng độ (%)</TableHead>
              <TableHead>Người nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const preparationId = item.id;
              const hasPreparationId =
                preparationId !== null && preparationId !== undefined;
              const isSelectable = Boolean(hasPreparationId && onSelectPreparation);
              const isSelected =
                selectedPreparationId !== null &&
                selectedPreparationId !== undefined &&
                hasPreparationId &&
                String(selectedPreparationId) === String(preparationId);

              return (
                <TableRow
                  key={item.id ?? index}
                  tabIndex={isSelectable ? 0 : undefined}
                  aria-selected={isSelected}
                  data-state={isSelected ? "selected" : undefined}
                  className={isSelectable ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (preparationId !== null && preparationId !== undefined) {
                      onSelectPreparation?.(preparationId);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      preparationId === null ||
                      preparationId === undefined ||
                      !isSelectable
                    ) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectPreparation?.(preparationId);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap border-r">
                    {formatDateTime(item.created_at)}
                  </TableCell>
                  <TableCell className="max-w-44 whitespace-normal break-words border-r">
                    {item.disinfectant_name}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatNumber(item.prepared_volume_l)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatPercent(item.actual_concentration)}
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
  );
}
