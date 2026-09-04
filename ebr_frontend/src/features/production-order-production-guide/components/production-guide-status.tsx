"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderProductionGuide } from "../types";

const getFileNameFromContentDisposition = (value?: string) => {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);
  return value.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function ProductionGuideStatus({
  productionOrderId,
}: {
  productionOrderId: string | number;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const guideKey = API_ROUTES.productionOrders.productionGuide(productionOrderId);
  const { data: guide, isLoading } =
    useSWR<ProductionOrderProductionGuide | null>(guideKey, () =>
      productionOrdersService.fetchProductionGuide(productionOrderId),
    );

  const handleOpen = async () => {
    if (!guide) return;
    const extension = guide.original_filename
      .slice(guide.original_filename.lastIndexOf("."))
      .toLowerCase();
    const canPreview =
      guide.mime_type === "application/pdf" ||
      guide.mime_type.startsWith("image/") ||
      [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(
        extension,
      );
    const previewWindow = canPreview ? window.open("about:blank", "_blank") : null;

    try {
      setIsOpening(true);
      const response =
        await productionOrdersService.downloadProductionGuide(productionOrderId);

      if (canPreview) {
        const previewBlob = new Blob([response.data], {
          type: guide.mime_type || response.data.type,
        });
        const previewUrl = window.URL.createObjectURL(previewBlob);
        if (previewWindow) {
          previewWindow.opener = null;
          previewWindow.location.href = previewUrl;
        } else {
          const link = document.createElement("a");
          link.href = previewUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
        window.setTimeout(() => window.URL.revokeObjectURL(previewUrl), 60_000);
      } else {
        const fileName =
          getFileNameFromContentDisposition(
            response.headers["content-disposition"],
          ) ?? guide.original_filename;
        downloadBlob(response.data, fileName);
      }
    } catch (error: any) {
      previewWindow?.close();
      toast.error(getErrorMessage(error, "Không thể mở file hướng dẫn sản xuất."));
    } finally {
      setIsOpening(false);
    }
  };

  if (isLoading || !guide) return null;

  return (
    <div className="flex w-full justify-start gap-3 md:gap-4">
      <div className="m-0.5 w-[170px] shrink-0 pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:w-[220px] md:pr-2">
        Hướng dẫn sản xuất
      </div>
      <div className="min-w-0 flex-1 text-left text-gray-800">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-4 shrink-0 rounded-full bg-green-500" />
          <button
            type="button"
            disabled={isOpening}
            onClick={handleOpen}
            className="flex min-w-0 items-center gap-2 truncate hover:text-blue-600 hover:underline disabled:opacity-60"
          >
            <span className="truncate">{guide.original_filename}</span>
            {isOpening ? <Loader2 className="size-4 shrink-0 animate-spin" /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
