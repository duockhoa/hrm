import { Skeleton } from "@/components/ui/skeleton";

type ProductOrder = {
  lot_no?: string | number | null;
  item_code?: string | number | null;
  status?: string | number | null;
  pyclm?: {
    isSent?: boolean | string | number | null;
  } | null;
  pyclm_is_sent?: boolean | string | number | null;
  is_pyclm_sent?: boolean | string | number | null;
  sampling_request_sent?: boolean | string | number | null;
  item?: {
    item_name?: string | null;
    unit?: string | null;
  } | null;
  planned_quatity?: string | number | null;
  planned_quantity?: string | number | null;
  unit?: string | null;
};

const formatProductionOrderStatus = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const statusLabels: Record<string, string> = {
    boposPlanned: "Đã lên kế hoạch",
    boppPlanned: "Đã lên kế hoạch",
    Planned: "Đã lên kế hoạch",
    P: "Đã lên kế hoạch",
    boposReleased: "Đã phát hành",
    boppReleased: "Đã phát hành",
    Released: "Đã phát hành",
    R: "Đã phát hành",
    boposClosed: "Đã đóng",
    boppClosed: "Đã đóng",
    Closed: "Đã đóng",
    L: "Đã đóng",
    boposCancelled: "Đã hủy",
    boppCancelled: "Đã hủy",
    Cancelled: "Đã hủy",
    C: "Đã hủy",
  };

  const key = String(value);

  return statusLabels[key] ?? key;
};

const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const getFirstValue = (source: ProductOrder | null | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key as keyof ProductOrder];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const getBooleanValue = (
  source: ProductOrder | null | undefined,
  keys: string[],
) => {
  const value = getFirstValue(source, keys);

  if (value === null) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  return ["1", "true", "yes", "sent", "done", "received", "passed"].includes(
    normalizedValue,
  );
};

const getPyclmSentStatus = (productOrder: ProductOrder | null) =>
  Boolean(
    productOrder?.pyclm?.isSent ??
      getBooleanValue(productOrder, [
        "pyclm_is_sent",
        "is_pyclm_sent",
        "sampling_request_sent",
      ]),
  );

const getProductionOrderStatusColor = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "text-gray-700";
  }

  const statusColors: Record<string, string> = {
    boposPlanned: "text-amber-600",
    boppPlanned: "text-amber-600",
    Planned: "text-amber-600",
    P: "text-amber-600",
    boposReleased: "text-green-600",
    boppReleased: "text-green-600",
    Released: "text-green-600",
    R: "text-green-600",
    boposClosed: "text-gray-600",
    boppClosed: "text-gray-600",
    Closed: "text-gray-600",
    L: "text-gray-600",
    boposCancelled: "text-red-600",
    boppCancelled: "text-red-600",
    Cancelled: "text-red-600",
    C: "text-red-600",
  };

  return statusColors[String(value)] ?? "text-gray-700";
};

export default function ItemProductOrder({
  productOrder,
  onClick,
  isActive = false,
}: {
  productOrder: ProductOrder | null;
  onClick: () => void;
  isActive?: boolean;
}) {
  const title =
    productOrder?.item?.item_name ??
    productOrder?.item_code ??
    productOrder?.lot_no ??
    "";
  const plannedQuantity =
    productOrder?.planned_quatity ?? productOrder?.planned_quantity ?? "";
  const formattedPlannedQuantity = formatNumber(plannedQuantity);
  const plannedQuantityUnit = productOrder?.unit ?? productOrder?.item?.unit ?? "";
  const plannedQuantityLabel = [formattedPlannedQuantity, plannedQuantityUnit]
    .filter(Boolean)
    .join(" ");
  const status = formatProductionOrderStatus(productOrder?.status);
  const statusColor = getProductionOrderStatusColor(productOrder?.status);
  const pyclmSent = getPyclmSentStatus(productOrder);

  return (
    <div
      className={`flex min-h-[100px] cursor-pointer items-center gap-4 border-b border-gray-200 px-3 py-4 ${
        isActive ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        {!productOrder ? (
          <Skeleton className="mb-2 h-4 w-40" />
        ) : (
          <p className="truncate text-sm font-bold text-gray-900">{title}</p>
        )}

        {!productOrder ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <p className="mt-1 truncate text-sm text-gray-600">
            {productOrder.lot_no}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {!productOrder ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <p className="text-sm text-gray-700">{plannedQuantityLabel}</p>
        )}

        {!productOrder ? (
          <Skeleton className="mt-2 h-3 w-20" />
        ) : status ? (
          <p className={`mt-1 text-xs font-semibold ${statusColor}`}>
            {status}
          </p>
        ) : null}

        {!productOrder ? (
          <Skeleton className="mt-2 h-5 w-24" />
        ) : (
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
              pyclmSent
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-red-50 text-red-700 ring-red-200"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                pyclmSent ? "bg-green-600" : "bg-red-600"
              }`}
            />
            {pyclmSent ? "Đã gửi PYCLM" : "Chưa gửi PYCLM"}
          </span>
        )}
      </div>
    </div>
  );
}
