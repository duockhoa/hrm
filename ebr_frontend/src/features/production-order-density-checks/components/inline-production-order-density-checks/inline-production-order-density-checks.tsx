import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type DensityCheckUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type ProductionOrderDensityCheck = {
  id?: number | string;
  empty_pycnometer_mass_g?: string | number | null;
  solution_pycnometer_mass_g?: string | number | null;
  water_pycnometer_mass_g?: string | number | null;
  density?: string | number | null;
  apparent_density?: string | number | null;
  created_at?: string | null;
  createdBy?: DensityCheckUser | null;
};

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

const formatDecimal = (
  value: string | number | null | undefined,
  fractionDigits = 4,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const getUserLabel = (user: DensityCheckUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

function ProductionOrderDensityChecksSkeleton() {
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

export default function InlineProductionOrderDensityChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderDensityCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderDensityChecksSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Tỉ trọng</h2>
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
              <TableHead className="border-r text-right">Bình rỗng (g)</TableHead>
              <TableHead className="border-r text-right">
                Bình chứa dung dịch (g)
              </TableHead>
              <TableHead className="border-r text-right">
                Bình chứa nước (g)
              </TableHead>
              <TableHead className="border-r text-right">Tỉ trọng</TableHead>
              <TableHead className="border-r text-right">
                Tỉ trọng biểu kiến
              </TableHead>
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
                    {formatDecimal(item.empty_pycnometer_mass_g)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatDecimal(item.solution_pycnometer_mass_g)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatDecimal(item.water_pycnometer_mass_g)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatDecimal(item.density, 4)}
                  </TableCell>
                  <TableCell className="border-r text-right">
                    {formatDecimal(item.apparent_density, 4)}
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
