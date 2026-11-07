import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({
  label,
  roundIcon = false,
}: {
  label: string;
  roundIcon?: boolean;
}) {
  return (
    <>
      <span role="status" className="sr-only">
        {label}
      </span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex items-center gap-3 rounded-md border border-transparent border-b-gray-200 p-3"
        >
          <Skeleton
            className={`size-10 shrink-0 ${roundIcon ? "rounded-full" : "rounded-md"}`}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="size-4 shrink-0" />
        </div>
      ))}
    </>
  );
}
