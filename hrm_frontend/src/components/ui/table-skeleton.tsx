import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

type SkeletonColumn = {
  className: string;
  secondaryClassName?: string;
};

export function TableSkeleton({
  columns,
  rows = 8,
  label,
}: {
  columns: SkeletonColumn[];
  rows?: number;
  label: string;
}) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <TableRow key={rowIndex}>
      {columns.map((column, columnIndex) => (
        <TableCell key={columnIndex}>
          {rowIndex === 0 && columnIndex === 0 && (
            <span role="status" className="sr-only">
              {label}
            </span>
          )}
          <div aria-hidden="true" className="space-y-1.5">
            <Skeleton className={`h-4 max-w-full ${column.className}`} />
            {column.secondaryClassName && (
              <Skeleton
                className={`h-3 max-w-full ${column.secondaryClassName}`}
              />
            )}
          </div>
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function TablePaginationSkeleton({
  showTotal = false,
}: {
  showTotal?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 px-4 py-3"
    >
      {showTotal ? <Skeleton className="h-4 w-32" /> : <div />}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}
