import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PrimaryPackagingConfirmation } from "../types";
import {
  formatConfirmationResult,
  formatDateTime,
  getConfirmationUserLabel,
} from "../utils";

function PrimaryPackagingConfirmationsSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-72" />
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

export default function InlinePrimaryPackagingConfirmations({
  data,
  onSelectConfirmation,
  selectedConfirmationId,
}: {
  data: PrimaryPackagingConfirmation[] | undefined;
  onSelectConfirmation?: (confirmationId: string | number) => void;
  selectedConfirmationId?: string | number | null;
}) {
  if (!data) {
    return <PrimaryPackagingConfirmationsSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Xác nhận trước đóng gói bao bì cấp 1
        </h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có dữ liệu
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-36 border-r">Thời điểm</TableHead>
                <TableHead className="min-w-36 border-r">
                  Thể tích/khối lượng
                </TableHead>
                <TableHead className="min-w-24 border-r">Cảm quan</TableHead>
                <TableHead className="min-w-24 border-r">In date</TableHead>
                <TableHead className="min-w-24 border-r">Vệ sinh</TableHead>
                <TableHead className="min-w-24 border-r">Độ kín</TableHead>
                <TableHead className="min-w-36">Người kiểm tra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((confirmation) => {
                const isSelected =
                  selectedConfirmationId !== null &&
                  selectedConfirmationId !== undefined &&
                  String(selectedConfirmationId) === String(confirmation.id);

                return (
                  <TableRow
                    key={confirmation.id}
                    tabIndex={onSelectConfirmation ? 0 : undefined}
                    aria-selected={isSelected}
                    data-state={isSelected ? "selected" : undefined}
                    className={onSelectConfirmation ? "cursor-pointer" : undefined}
                    onClick={() => onSelectConfirmation?.(confirmation.id)}
                    onKeyDown={(event) => {
                      if (
                        onSelectConfirmation &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        onSelectConfirmation(confirmation.id);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap border-r">
                      {formatDateTime(confirmation.created_at)}
                    </TableCell>
                    <TableCell className="border-r">
                      {formatConfirmationResult(
                        confirmation.volume_weight_checked,
                      )}
                    </TableCell>
                    <TableCell className="border-r">
                      {formatConfirmationResult(confirmation.sensory_checked)}
                    </TableCell>
                    <TableCell className="border-r">
                      {formatConfirmationResult(
                        confirmation.date_print_checked,
                      )}
                    </TableCell>
                    <TableCell className="border-r">
                      {formatConfirmationResult(confirmation.hygiene_checked)}
                    </TableCell>
                    <TableCell className="border-r">
                      {formatConfirmationResult(
                        confirmation.seal_integrity_checked,
                      )}
                    </TableCell>
                    <TableCell>
                      {getConfirmationUserLabel(confirmation.createdBy)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
