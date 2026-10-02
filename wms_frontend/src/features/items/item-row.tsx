import { Skeleton } from "@/components/ui/skeleton";
import type { Item } from "./types";

export default function ItemRow({
  item,
  onClick,
  isActive = false,
}: {
  item: Item | null;
  onClick?: () => void;
  isActive?: boolean;
}) {
  if (!item) {
    return (
      <div className="flex min-h-[100px] items-center gap-4 border-b border-gray-200 px-3 py-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-[100px] w-full cursor-pointer items-center gap-4 border-b border-gray-200 px-3 py-4 text-left ${
        isActive ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-gray-900">{item.item_name}</p>
        <p className="mt-1 truncate text-sm text-gray-600">
          {[item.item_code, item.dk_code].filter(Boolean).join(" - ")}
        </p>
      </div>
      <p className="shrink-0 text-right text-sm text-gray-700">{item.unit}</p>
    </button>
  );
}
