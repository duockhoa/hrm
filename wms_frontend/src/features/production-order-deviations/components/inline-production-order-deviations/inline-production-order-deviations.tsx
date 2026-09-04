"use client";

import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";

type DeviationUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type DeviationImage =
  | string
  | {
      url?: string | null;
      path?: string | null;
      filename?: string | null;
      file_name?: string | null;
      name?: string | null;
    };

type ProductionOrderDeviation = {
  id?: number | string;
  deviation_content?: string | null;
  handling_plan?: string | null;
  created_at?: string | null;
  reporter?: DeviationUser | null;
  deviation_images?: DeviationImage[] | DeviationImage | null;
  deviation_image?: DeviationImage | null;
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

const getUserLabel = (user: DeviationUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

const getImageFilename = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  try {
    const url = /^https?:\/\//i.test(value)
      ? new URL(value)
      : new URL(value, "http://localhost");
    const pathParts = url.pathname.split("/").filter(Boolean);

    return decodeURIComponent(pathParts[pathParts.length - 1] ?? "");
  } catch {
    const pathParts = value
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean);

    return decodeURIComponent(pathParts[pathParts.length - 1] ?? value);
  }
};

const getDeviationImageFilename = (deviation: ProductionOrderDeviation) => {
  const firstImage = Array.isArray(deviation.deviation_images)
    ? deviation.deviation_images[0]
    : (deviation.deviation_images ?? deviation.deviation_image);

  if (typeof firstImage === "string") {
    return getImageFilename(firstImage);
  }

  if (!firstImage) {
    return "";
  }

  return (
    firstImage.filename ??
    firstImage.file_name ??
    firstImage.name ??
    getImageFilename(firstImage.url ?? firstImage.path)
  );
};

function DeviationThumbnail({ filename }: { filename: string }) {
  const src = `${API_ROUTES.productionOrderDeviations.images}/${encodeURIComponent(filename)}`;

  return (
    <AuthenticatedImage
      src={src}
      alt="Ảnh sai lệch"
      className="h-[70px] w-[70px] shrink-0"
      height={70}
      width={70}
      loading="lazy"
      objectFit="contain"
    />
  );
}

function ProductionOrderDeviationsSkeleton() {
  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-40" />
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

export default function InlineProductionOrderDeviations({
  data,
  selectedDeviationId,
  onSelectDeviation,
}: {
  data: ProductionOrderDeviation[] | undefined;
  selectedDeviationId?: string | number | null;
  onSelectDeviation?: (deviationId: string | number) => void;
}) {
  if (!data) {
    return <ProductionOrderDeviationsSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Danh sách sai lệch</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          chưa có dữ liệu
        </div>
      ) : (
        <div className="max-h-[60vh] divide-y divide-gray-200 overflow-auto rounded border">
          {data.map((deviation, index) => {
            const deviationId = deviation.id;
            const hasDeviationId =
              deviationId !== null && deviationId !== undefined;
            const isSelectable = Boolean(hasDeviationId && onSelectDeviation);
            const isSelected =
              selectedDeviationId !== null &&
              selectedDeviationId !== undefined &&
              hasDeviationId &&
              String(selectedDeviationId) === String(deviationId);
            const imageFilename = getDeviationImageFilename(deviation);

            return (
              <div
                key={deviation.id ?? index}
                tabIndex={isSelectable ? 0 : undefined}
                role={isSelectable ? "button" : undefined}
                aria-selected={isSelected}
                className={`flex min-h-[90px] gap-3 p-3 text-left transition-colors ${
                  isSelectable ? "cursor-pointer hover:bg-gray-50" : "bg-white"
                } ${isSelected ? "bg-gray-100" : "bg-white"}`}
                onClick={() => {
                  if (deviationId !== null && deviationId !== undefined) {
                    onSelectDeviation?.(deviationId);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    deviationId === null ||
                    deviationId === undefined ||
                    !isSelectable
                  ) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectDeviation?.(deviationId);
                  }
                }}
              >
                <DeviationThumbnail filename={imageFilename} />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line break-words font-semibold text-gray-900">
                    {deviation.deviation_content}
                  </p>
                  {deviation.handling_plan && (
                    <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-500">
                      Phương án xử lý: {deviation.handling_plan}
                    </p>
                  )}
                </div>
                <div className="flex min-w-28 flex-col items-end gap-2 text-right text-sm text-gray-700">
                  <p>{formatDateTime(deviation.created_at)}</p>
                  <p className="max-w-36 break-words">
                    {getUserLabel(deviation.reporter)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
