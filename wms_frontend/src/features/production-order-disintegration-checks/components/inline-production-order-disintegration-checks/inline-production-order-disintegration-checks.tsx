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
import type { ProductionOrderDisintegrationCheck } from "../../types";
import {
  UNIT_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatPassFail,
  getUserLabel,
} from "../../utils";

const inlinePassFailClassName = "border-transparent bg-transparent text-gray-700";

function ProductionOrderDisintegrationChecksSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-36" />
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

export default function InlineProductionOrderDisintegrationChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderDisintegrationCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderDisintegrationChecksSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Độ rã</h2>
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
              <TableHead className="border-r">Dạng/công đoạn</TableHead>
              {UNIT_KEYS.map((_, index) => (
                <TableHead key={index} className="border-r text-center">
                  Viên {index + 1}
                </TableHead>
              ))}
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
                    {formatDosageFormStage(item.dosage_form_stage)}
                  </TableCell>
                  {UNIT_KEYS.map((unitKey) => (
                    <TableCell key={unitKey} className="border-r text-center">
                      <Badge
                        variant="outline"
                        className={inlinePassFailClassName}
                      >
                        {formatPassFail(item[unitKey])}
                      </Badge>
                    </TableCell>
                  ))}
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
