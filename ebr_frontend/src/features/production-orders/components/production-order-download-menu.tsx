"use client";

import { useState } from "react";
import { Download, FileDown, Loader2, Tags } from "lucide-react";
import { FaFileImport } from "react-icons/fa";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FormExportWarehouseRelease from "@/components/form-export-warehouse-release/form-export-warehouse-release";
import DispensedMaterialLabelForm from "@/components/form-dispensed-material-label/form-dispensed-material-label";
import SemiFinishedProductLabelForm from "@/components/form-semi-finished-product-label/form-semi-finished-product-label";
import { isProductionOrderFeatureEnabled } from "@/features/features";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import useUserStore from "@/store/user.store";

const getFileNameFromContentDisposition = (contentDisposition?: string) => {
  if (!contentDisposition) return null;

  const utf8FileName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8FileName?.[1]) return decodeURIComponent(utf8FileName[1]);

  return contentDisposition.match(/filename="?([^"]+)"?/i)?.[1] ?? null;
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

export default function ProductionOrderDownloadMenu({
  productionOrder,
}: {
  productionOrder: any;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const { data: permissions, error: permissionsError } = useSWR(
    userId ? [API_ROUTES.users.myPermissions, userId] : null,
    () => userService.fetchMyPermissions(),
  );
  const [isWarehouseReleaseOpen, setIsWarehouseReleaseOpen] = useState(false);
  const [isDispensedMaterialLabelOpen, setIsDispensedMaterialLabelOpen] =
    useState(false);
  const [isSemiFinishedProductLabelOpen, setIsSemiFinishedProductLabelOpen] =
    useState(false);
  const [exporting, setExporting] = useState<"order" | "report" | null>(null);
  const productionOrderId =
    productionOrder?.id ??
    productionOrder?.production_order_id ??
    productionOrder?.DocumentAbsoluteEntry;
  const isActionEnabled = (key: string, permissionKey: string) =>
    Boolean(
      productionOrder &&
        isProductionOrderFeatureEnabled(
          productionOrder.featureConfig,
          "action",
          key,
        ) &&
        !permissionsError &&
        permissions?.permissionKeys.includes(permissionKey),
    );
  const canExportOrder = isActionEnabled(
    "export_production_order",
    "production-orders.export",
  );
  const canExportWarehouseRelease = isActionEnabled(
    "export_warehouse_release",
    "production-orders.export-warehouse-release",
  );
  const canCreateDispensedMaterialLabel = isActionEnabled(
    "create_dispensed_material_label",
    "production-orders.dispensed-material-labels.create",
  );
  const canCreateSemiFinishedProductLabel = isActionEnabled(
    "create_semi_finished_product_label",
    "production-orders.semi-finished-product-labels.create",
  );

  const handleExport = async (type: "order" | "report") => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy mã lệnh sản xuất");
      return;
    }

    const label = type === "order" ? "lệnh sản xuất" : "báo cáo lô";
    try {
      setExporting(type);
      const response =
        type === "order"
          ? await productionOrdersService.exportProductionOrder(productionOrderId)
          : await productionOrdersService.exportProductionOrderBatchReportPDF(
              productionOrderId,
            );
      const fallbackFileName =
        type === "order"
          ? `production-order-${productionOrderId}.xlsx`
          : `batch-report-${productionOrderId}.pdf`;
      downloadBlob(
        response.data,
        getFileNameFromContentDisposition(
          response.headers["content-disposition"],
        ) ?? fallbackFileName,
      );
      toast.success(`Xuất ${label} thành công`);
    } catch {
      toast.error(`Xuất ${label} thất bại`);
    } finally {
      setExporting(null);
    }
  };

  if (
    !canExportOrder &&
    !canExportWarehouseRelease &&
    !canCreateDispensedMaterialLabel &&
    !canCreateSemiFinishedProductLabel
  ) {
    return null;
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            title="Tải xuống"
            aria-label="Tải xuống"
            disabled={exporting !== null}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {canExportOrder && (
            <DropdownMenuItem onSelect={() => void handleExport("order")}>
              <FileDown className="text-emerald-500" />
              Xuất lệnh sản xuất
            </DropdownMenuItem>
          )}
          {canExportWarehouseRelease && (
            <DropdownMenuItem onSelect={() => setIsWarehouseReleaseOpen(true)}>
              <FaFileImport className="text-blue-500" />
              Xuất PXK
            </DropdownMenuItem>
          )}
          {canExportOrder && (
            <DropdownMenuItem onSelect={() => void handleExport("report")}>
              <FileDown className="text-red-500" />
              Xuất báo cáo
            </DropdownMenuItem>
          )}
          {canCreateDispensedMaterialLabel && (
            <DropdownMenuItem
              onSelect={() => setIsDispensedMaterialLabelOpen(true)}
            >
              <Tags className="text-blue-500" />
              Tạo nhãn cấp phát
            </DropdownMenuItem>
          )}
          {canCreateSemiFinishedProductLabel && (
            <DropdownMenuItem
              onSelect={() => setIsSemiFinishedProductLabelOpen(true)}
            >
              <Tags className="text-blue-500" />
              Tạo nhãn BTP
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        modal={false}
        open={isWarehouseReleaseOpen && canExportWarehouseRelease}
        onOpenChange={setIsWarehouseReleaseOpen}
      >
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Xuất PXK</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <FormExportWarehouseRelease
              data={productionOrder}
              onClose={() => setIsWarehouseReleaseOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        modal={false}
        open={isDispensedMaterialLabelOpen && canCreateDispensedMaterialLabel}
        onOpenChange={setIsDispensedMaterialLabelOpen}
      >
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tạo nhãn cấp phát</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <DispensedMaterialLabelForm
              data={productionOrder}
              onClose={() => setIsDispensedMaterialLabelOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        modal={false}
        open={isSemiFinishedProductLabelOpen && canCreateSemiFinishedProductLabel}
        onOpenChange={setIsSemiFinishedProductLabelOpen}
      >
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tạo nhãn BTP</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <SemiFinishedProductLabelForm
              productionOrderId={productionOrderId}
              onClose={() => setIsSemiFinishedProductLabelOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
