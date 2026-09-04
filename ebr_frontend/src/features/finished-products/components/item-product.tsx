import { Skeleton } from "@/components/ui/skeleton";

export default function ItemProduct({
  product,
  onClick,
  isActive = false,
}: {
  product: any;
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[100px] cursor-pointer items-center gap-4 border-b border-gray-200 px-3 py-4 ${
        isActive ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        {!product ? (
          <Skeleton className="mb-2 h-4 w-40" />
        ) : (
          <p className="truncate text-sm font-bold text-gray-900">
            {product.item_name}
          </p>
        )}

        {!product ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className="mt-1 truncate text-sm text-gray-600">
            {product.item_code} - {product.dk_code}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {!product ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <p className="text-sm text-gray-700">{product.unit}</p>
        )}
      </div>
    </div>
  );
}
