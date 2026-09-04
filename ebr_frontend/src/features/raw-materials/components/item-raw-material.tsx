import { Skeleton } from "@/components/ui/skeleton";

export default function ItemRawMaterial({
  rawMaterial,
  onClick,
  isActive = false,
}: {
  rawMaterial: any;
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
        {!rawMaterial ? (
          <Skeleton className="mb-2 h-4 w-40" />
        ) : (
          <p className="truncate text-sm font-bold text-gray-900">
            {rawMaterial.item_name}
          </p>
        )}

        {!rawMaterial ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className="mt-1 truncate text-sm text-gray-600">
            {rawMaterial.item_code} - {rawMaterial.dk_code}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {!rawMaterial ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <p className="text-sm text-gray-700">{rawMaterial.unit}</p>
        )}
      </div>
    </div>
  );
}
