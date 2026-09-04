"use client";

import OpenFormButton from "@/components/button-open-form/button-open-form";
import DispensedMaterialLabelForm from "@/components/form-dispensed-material-label/form-dispensed-material-label";
import {
  isProductionOrderFeatureEnabled,
  type ProductionOrderFeatureConfig,
} from "@/features/features";
import { FormProductionOrderFinishedProductSummary } from "@/features/finished-product-summary";
import { FormProductionOrderExtractionSummary } from "@/features/production-order-material-process-summaries";
import {
  FormProductionOrderBlisterPackingSummary,
  FormProductionOrderAmpoulePackingSummary,
  FormProductionOrderCapsuleFillingSummary,
  FormProductionOrderFilmCoatingSummary,
  FormProductionOrderGranuleBaggingSummary,
  FormProductionOrderSolutionBaggingSummary,
  FormProductionOrderTabletVialFillingSummary,
  FormProductionOrderTabletingSummary,
  FormProductionOrderVialFillingSummary,
} from "@/features/production-order-semi-finished-product-summaries";
import { FormProductionOrderFactoryReleaseReview } from "@/features/production-order-factory-release-reviews";
import { FormProductionOrderEnvironmentCheck } from "@/features/production-order-environment-checks";
import { FormProductionOrderLineClearanceCheck } from "@/features/production-order-line-clearance-checks";
import { FormProductionOrderSecondaryPackagingCheck } from "@/features/production-order-secondary-packaging-checks";
import { FormPreSecondaryPackagingCheck } from "@/features/production-order-pre-secondary-packaging-checks";
import {
  ProductionGuideStatus,
  ProductionGuideUploadButton,
} from "@/features/production-order-production-guide";
import { FormProductionOrderHygieneCheck } from "@/features/production-order-hygiene-checks";
import { SteamSterilizationChecksView } from "@/features/production-order-steam-sterilization-checks";
import { PostSecondaryPackagingSummariesView } from "@/features/production-order-post-secondary-packaging-summaries";
import { FiltrationChecksView } from "@/features/production-order-filtration-checks";
import { FormProductionOrderDensityCheck } from "@/features/production-order-density-checks";
import { FormProductionOrderPostHomogenizationGranuleCheck } from "@/features/production-order-post-homogenization-granule-checks";
import { FormProductionOrderPostPreparationSolutionCheck } from "@/features/production-order-post-preparation-solution-checks";
import { FormProductionOrderFriabilityCheck } from "@/features/production-order-friability-checks";
import { FormProductionOrderDisintegrationCheck } from "@/features/production-order-disintegration-checks";
import { FormProductionOrderVialInspectionCheck } from "@/features/production-order-vial-inspection-checks";
import { FormProductionOrderSensoryCheck } from "@/features/production-order-sensory-checks";
import { FormPrimaryPackagingConfirmation } from "@/features/production-order-primary-packaging-confirmations";
import {
  FormProductionOrderAmpouleSensoryCheck,
  FormProductionOrderBlisterSensoryCheck,
  FormProductionOrderBottleSensoryCheck,
  FormProductionOrderCapsuleSensoryCheck,
  FormProductionOrderGranulePackageSensoryCheck,
  FormProductionOrderSolutionPackageSensoryCheck,
  FormProductionOrderTabletWeightSensoryCheck,
} from "@/features/production-order-product-sensory-checks";
import { FormProductionOrderHardCapsuleLeakageCheck } from "@/features/production-order-hard-capsule-leakage-checks";
import {
  FormBlisterLeakTightnessCheck,
  FormBottleLeakTightnessCheck,
  FormGranulePackageLeakTightnessCheck,
  FormSolutionPackageLeakTightnessCheck,
} from "@/features/production-order-leak-tightness-checks";
import { FormProductionOrderVialVolumeCheck } from "@/features/production-order-volume-checks";
import { FormProductionOrderSprayDoseCheck } from "@/features/production-order-spray-dose-checks";
import { FormProductionOrderHardnessCheck } from "@/features/production-order-hardness-checks";
import { FormProductionOrderTabletThicknessCheck } from "@/features/production-order-tablet-thickness-checks";
import {
  FormProductionOrderCapsuleGrossWeightCheck,
  FormProductionOrderGranuleBagWeightInput,
  FormProductionOrderSolutionPackageWeightCheck,
} from "@/features/production-order-semi-finished-gross-weight-checks";
import {
  FormProductionOrderFilmCoatedTabletWeightCheck,
  FormProductionOrderGranulesInBagWeightCheck,
  FormProductionOrderTabletWeightCheck,
  FormProductionOrderVialSolutionMassCheck,
} from "@/features/production-order-semi-finished-net-weight-checks";
import { FormProductionOrderShellWeightCheck } from "@/features/production-order-shell-weight-checks";
import { FormProductionOrderTenShellWeightCheck } from "@/features/production-order-ten-shell-weight-checks";
import { FormProductionOrderCylinderCalibration } from "@/features/production-order-cylinder-calibrations";
import { FormProductionOrderSamplingRecord } from "@/features/production-order-sampling-records";
import { FormProductionOrderDisinfectantPreparation } from "@/features/production-order-disinfectant-preparations";
import { FormProductionOrderAttachment } from "@/features/production-order-attachments";
import SemiFinishedProductLabelForm from "@/components/form-semi-finished-product-label/form-semi-finished-product-label";
import { FormAddProductionOrderDeviation } from "@/features/production-order-deviations";
import FormCreateSamplingRequest from "@/components/form-create-sampling-request/form-create-sampling-request";
import FormExportWarehouseRelease from "@/components/form-export-warehouse-release/form-export-warehouse-release";
import FormExportWeighingTicket from "@/components/form-export-weighing-ticket/form-export-weighing-ticket";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import { productionSpecificationsService } from "@/services/index.service";
import productionOrdersService from "@/services/product-orders.service";
import {
  Beaker,
  BottleWine,
  Boxes,
  ClipboardList,
  Droplets,
  Eye,
  FileCheck,
  FileText,
  FlaskConical,
  CookingPot,
  Filter,
  FileDown,
  FileUp,
  Frown,
  Layers,
  Loader2,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  Paintbrush,
  Percent,
  Pill,
  PillBottle,
  Ruler,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Settings2,
  Soup,
  SprayCan,
  Tags,
  Tablets,
  ThermometerSun,
  Weight,
  Wheat,
} from "lucide-react";
import * as React from "react";
import { FaFileExport, FaFileImport } from "react-icons/fa";
import { GiChipsBag } from "react-icons/gi";
import { LuFileInput } from "react-icons/lu";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("vi-VN");
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

const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const getFileNameFromContentDisposition = (contentDisposition?: string) => {
  if (!contentDisposition) {
    return null;
  }

  const utf8FileName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8FileName?.[1]) {
    return decodeURIComponent(utf8FileName[1]);
  }

  const fileName = contentDisposition.match(/filename="?([^"]+)"?/i);
  return fileName?.[1] ?? null;
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

const formatProductionOrderType = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const typeLabels: Record<string, string> = {
    bopotStandard: "Tiêu chuẩn",
    Standard: "Tiêu chuẩn",
    S: "Tiêu chuẩn",
    bopotSpecial: "Đặc biệt",
    Special: "Đặc biệt",
    P: "Đặc biệt",
    bopotDisassembly: "Tháo rã",
    Disassembly: "Tháo rã",
    D: "Tháo rã",
  };

  const key = String(value);

  return typeLabels[key] ?? key;
};

function ProductOrderDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="mx-auto h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportProductionOrderButton({
  productionOrderId,
}: {
  productionOrderId?: string | number | null;
}) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy mã lệnh sản xuất");
      return;
    }

    try {
      setIsExporting(true);
      const response =
        await productionOrdersService.exportProductionOrder(productionOrderId);
      const fileName =
        getFileNameFromContentDisposition(
          response.headers["content-disposition"],
        ) ?? `production-order-${productionOrderId}.xlsx`;

      downloadBlob(response.data, fileName);
      toast.success("Xuất lệnh sản xuất thành công");
    } catch {
      toast.error("Xuất lệnh sản xuất thất bại");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-center p-0.5 md:p-1">
      <button
        type="button"
        title="Xuất lệnh sản xuất"
        disabled={isExporting}
        onClick={handleExport}
        className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-emerald-500 px-3 py-2 text-center text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
      >
        {isExporting ? <Loader2 className="animate-spin" /> : <FileDown />}
      </button>
      <div className="w-[68px] md:w-[90px]">
        <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
          Xuất lệnh sản xuất
        </p>
      </div>
    </div>
  );
}

function SamplingRequestStatus({
  samplingRequest,
}: {
  samplingRequest?: {
    isSent?: boolean;
    googleDocUrl?: string | null;
  } | null;
}) {
  const label = samplingRequest?.isSent ? "Đã gửi" : "Chưa gửi";

  return (
    <div className="flex w-full justify-start gap-3 md:gap-4">
      <div className="m-0.5 w-[170px] shrink-0 pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:w-[220px] md:pr-2">
        Gửi PYCLM
      </div>
      <div className="min-w-0 flex-1 text-left text-gray-800">
        <div className="flex items-center gap-2">
          <span
            className={`size-4 rounded-full ${
              samplingRequest?.isSent ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {samplingRequest?.googleDocUrl ? (
            <a
              href={samplingRequest.googleDocUrl}
              target="_blank"
              rel="noreferrer"
              className="text-gray-800 hover:text-blue-600 hover:underline"
            >
              {label}
            </a>
          ) : (
            <span className="text-gray-800">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}

type ProductionOrderDocumentControlUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type ProductionOrderDocumentControl = {
  production_order_id?: string | number | null;
  batch_record_issued_at?: string | null;
  batchRecordIssuedBy?: ProductionOrderDocumentControlUser | null;
  batch_record_received_at?: string | null;
  batchRecordReceivedBy?: ProductionOrderDocumentControlUser | null;
  test_certificate_received_at?: string | null;
  testCertificateReceivedBy?: ProductionOrderDocumentControlUser | null;
  warehouse_release_received_at?: string | null;
  warehouseReleaseReceivedBy?: ProductionOrderDocumentControlUser | null;
};

type DocumentControlActionKey =
  | "issue_batch_record"
  | "receive_batch_record"
  | "receive_test_certificate"
  | "receive_warehouse_release";

const getDocumentControlUserLabel = (
  user: ProductionOrderDocumentControlUser | null | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

const getDocumentControlStatusText = (
  completedAt: string | null | undefined,
  completedBy: ProductionOrderDocumentControlUser | null | undefined,
) => {
  if (!completedAt) {
    return "Chưa thực hiện";
  }

  const userLabel = getDocumentControlUserLabel(completedBy);

  return [formatDateTime(completedAt), userLabel && `- ${userLabel}`]
    .filter(Boolean)
    .join(" ");
};

function ProductionOrderDocumentControlStatus({
  documentControl,
}: {
  documentControl?: ProductionOrderDocumentControl | null;
}) {
  return (
    <>
      <FieldDisplay
        lable="Cấp hồ sơ lô giấy"
        value={getDocumentControlStatusText(
          documentControl?.batch_record_issued_at,
          documentControl?.batchRecordIssuedBy,
        )}
      />
      <FieldDisplay
        lable="Nhận hồ sơ lô giấy"
        value={getDocumentControlStatusText(
          documentControl?.batch_record_received_at,
          documentControl?.batchRecordReceivedBy,
        )}
      />
      <FieldDisplay
        lable="Nhận phiếu xuất kho"
        value={getDocumentControlStatusText(
          documentControl?.warehouse_release_received_at,
          documentControl?.warehouseReleaseReceivedBy,
        )}
      />
      <FieldDisplay
        lable="Nhận phiếu kiểm nghiệm"
        value={getDocumentControlStatusText(
          documentControl?.test_certificate_received_at,
          documentControl?.testCertificateReceivedBy,
        )}
      />
    </>
  );
}

function ProductionOrderDocumentControlActions({
  productionOrderId,
  featureConfig,
}: {
  productionOrderId?: string | number | null;
  featureConfig?: ProductionOrderFeatureConfig;
}) {
  const [confirmingActionKey, setConfirmingActionKey] =
    React.useState<DocumentControlActionKey | null>(null);
  const [submittingAction, setSubmittingAction] =
    React.useState<DocumentControlActionKey | null>(null);

  const documentControlActions: Array<{
    key: DocumentControlActionKey;
    label: string;
    title: string;
    icon: React.ReactNode;
    submit: (
      id: string | number,
    ) => Promise<ProductionOrderDocumentControl | null>;
  }> = [
    {
      key: "issue_batch_record",
      label: "Cấp hồ sơ lô giấy",
      title: "Cấp hồ sơ lô giấy",
      icon: <FileUp />,
      submit: productionOrdersService.issueProductionOrderBatchRecord,
    },
    {
      key: "receive_batch_record",
      label: "Nhận hồ sơ lô giấy",
      title: "Nhận hồ sơ lô giấy",
      icon: <FileCheck />,
      submit: productionOrdersService.receiveProductionOrderBatchRecord,
    },
    {
      key: "receive_warehouse_release",
      label: "Nhận phiếu xuất kho",
      title: "Nhận phiếu xuất kho",
      icon: <PackageCheck />,
      submit: productionOrdersService.receiveProductionOrderWarehouseRelease,
    },
    {
      key: "receive_test_certificate",
      label: "Nhận phiếu kiểm nghiệm",
      title: "Nhận phiếu kiểm nghiệm",
      icon: <FileCheck />,
      submit: productionOrdersService.receiveProductionOrderTestCertificate,
    },
  ];
  const normalizedFeatureConfig = featureConfig ?? null;
  const enabledDocumentControlActions = documentControlActions.filter(
    (action) =>
      isProductionOrderFeatureEnabled(
        normalizedFeatureConfig,
        "action",
        action.key,
      ),
  );

  const handleAction = async (
    action: (typeof documentControlActions)[number],
  ) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy mã lệnh sản xuất.");
      return;
    }

    try {
      setSubmittingAction(action.key);
      await action.submit(productionOrderId);
      await mutate(`${API_ROUTES.productionOrders.base}/${productionOrderId}`);
      toast.success(`Đã ${action.label.toLocaleLowerCase("vi-VN")}.`, {
        duration: 1000,
        position: "top-left",
      });
      setConfirmingActionKey(null);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          `Không thể ${action.label.toLocaleLowerCase("vi-VN")}.`,
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const confirmingAction =
    enabledDocumentControlActions.find(
      (action) => action.key === confirmingActionKey,
    ) ?? null;

  return (
    <>
      {enabledDocumentControlActions.map((action) => (
        <div
          key={action.key}
          className="inline-flex flex-col items-center p-0.5 md:p-1"
        >
          <button
            type="button"
            title={action.title}
            disabled={!productionOrderId || submittingAction !== null}
            onClick={() => setConfirmingActionKey(action.key)}
            className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-sky-500 px-3 py-2 text-center text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
          >
            {submittingAction === action.key ? (
              <Loader2 className="animate-spin" />
            ) : (
              action.icon
            )}
          </button>
          <div className="w-[68px] md:w-[90px]">
            <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
              {action.label}
            </p>
          </div>
        </div>
      ))}

      <Dialog
        modal={false}
        open={confirmingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingActionKey(null);
          }
        }}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              Xác nhận {confirmingAction?.label.toLocaleLowerCase("vi-VN")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn{" "}
              {confirmingAction?.label.toLocaleLowerCase("vi-VN")} cho lệnh sản
              xuất này không?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submittingAction !== null}
                onClick={() => setConfirmingActionKey(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={!confirmingAction || submittingAction !== null}
                onClick={() => {
                  if (confirmingAction) {
                    void handleAction(confirmingAction);
                  }
                }}
              >
                {submittingAction !== null ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ProductOrderDetail({
  productOrder,
  productionOrderLines,
  onOpenMaterialSummary,
  onOpenMixingRecord,
  onOpenEquipmentMonitoringRecord,
  onOpenSteamSterilizationChecks,
  onOpenSteamSterilizationCheckDetail,
  onOpenDateChecks,
  onOpenFiltrationChecks,
  onOpenFiltrationCheckDetail,
  onOpenPostSecondaryPackagingSummaries,
  onOpenPostSecondaryPackagingSummaryDetail,
}: {
  productOrder: any;
  productionOrderLines?: any[];
  onOpenMaterialSummary?: (productionOrderId: string | number) => void;
  onOpenMixingRecord?: (productionOrderId: string | number) => void;
  onOpenEquipmentMonitoringRecord?: (
    productionOrderId: string | number,
    itemCode?: string | number | null,
  ) => void;
  onOpenSteamSterilizationChecks?: (productionOrderId: string | number) => void;
  onOpenSteamSterilizationCheckDetail?: (checkId: string | number) => void;
  onOpenDateChecks?: (productionOrderId: string | number) => void;
  onOpenFiltrationChecks?: (productionOrderId: string | number) => void;
  onOpenFiltrationCheckDetail?: (checkId: string | number) => void;
  onOpenPostSecondaryPackagingSummaries?: (
    productionOrderId: string | number,
  ) => void;
  onOpenPostSecondaryPackagingSummaryDetail?: (
    summaryId: string | number,
  ) => void;
}) {
  const productOrderItemCode =
    productOrder?.item_code ?? productOrder?.item?.item_code;
  const { data: fetchedProductionSpecification } = useSWR(
    productOrderItemCode
      ? `${API_ROUTES.productionSpecifications.base}/${encodeURIComponent(String(productOrderItemCode))}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        String(productOrderItemCode),
      ),
  );

  if (!productOrder) {
    return <ProductOrderDetailSkeleton />;
  }

  const itemName = productOrder.item?.item_name ?? "";
  const registrationNumber =
    productOrder.item?.registration?.registration_number ?? "";
  const productionOrderId =
    productOrder.id ??
    productOrder.production_order_id ??
    productOrder.DocumentAbsoluteEntry;
  const productionSpecification =
    fetchedProductionSpecification ??
    productOrder.productionSpecification ??
    productOrder.item?.productionSpecification ??
    null;
  const productionOrderDosageFormId =
    productionSpecification?.dosage_form_id ??
    productionSpecification?.dosageForm?.id;
  const productionOrderDosageFormName =
    productionSpecification?.dosageForm?.name ??
    productionSpecification?.dosage_form;
  const productionOrderDosageFormRequirement =
    productionSpecification?.dosageForm?.sensory_requirement;
  const volumeRequirementSource = {
    ...(productOrder.item ?? {}),
    ...(productOrder.productionSpecification ?? {}),
    ...(productOrder.item?.productionSpecification ?? {}),
  };
  const featureConfig = productOrder.featureConfig;
  const isActionEnabled = (key: string) =>
    isProductionOrderFeatureEnabled(featureConfig, "action", key);
  const isActionConfigured = (key: string) =>
    Boolean(
      featureConfig?.actions?.some(
        (feature: { key?: string | null }) => feature.key === key,
      ),
    );
  const isCapsuleFillingSummaryEnabled =
    isActionEnabled("create_capsule_filling_summary") ||
    (!isActionConfigured("create_capsule_filling_summary") &&
      isActionEnabled("create_capsule_gross_weight_check"));
  const isBlisterSensoryCheckEnabled =
    isActionEnabled("create_blister_sensory_check") ||
    (!isActionConfigured("create_blister_sensory_check") &&
      isActionEnabled("create_blister_leak_tightness_check"));
  const isTabletHardnessCheckEnabled =
    isActionEnabled("create_tablet_hardness_check") ||
    (!isActionConfigured("create_tablet_hardness_check") &&
      isActionEnabled("create_hardness_check"));
  const isVialWeightCheckEnabled = isActionEnabled("create_vial_weight_check");
  const isVialSolutionMassCheckEnabled = isActionEnabled(
    "create_vial_solution_mass_check",
  );
  const isTubeSolutionMassCheckEnabled = isActionEnabled(
    "create_tube_solution_mass_check",
  );

  return (
    <div className="flex w-full max-w-4xl flex-col gap-2 md:gap-4">
      <div className="flex flex-col gap-4 rounded border bg-white p-3 text-center shadow-md md:gap-8 md:p-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          <h1 className="break-words text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            {itemName}
          </h1>
          <span className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            -
          </span>
          <p className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            {productOrder.lot_no}
          </p>
        </div>

        <div className="grid w-full grid-cols-4 justify-items-center gap-x-1 gap-y-1 md:min-h-50 md:grid-cols-[repeat(auto-fill,minmax(90px,1fr))] md:gap-2">
          {isActionEnabled("export_warehouse_release") && (
            <OpenFormButton
              icon={<FaFileImport />}
              name="Xuất PXK"
              form={
                <FormExportWarehouseRelease
                  data={productOrder}
                  productionOrderLines={productionOrderLines}
                />
              }
            />
          )}
          {isActionEnabled("export_weighing_ticket") && (
            <OpenFormButton
              icon={<FaFileExport />}
              name="Xuất phiếu cân"
              form={
                <FormExportWeighingTicket
                  data={productOrder}
                  productionOrderLines={productionOrderLines}
                />
              }
            />
          )}
          {isActionEnabled("export_production_order") && (
            <ExportProductionOrderButton
              productionOrderId={productionOrderId}
            />
          )}
          <ProductionOrderDocumentControlActions
            productionOrderId={productionOrderId}
            featureConfig={featureConfig}
          />
          {isActionEnabled("view_mixing_record") &&
            productionOrderId !== null &&
            productionOrderId !== undefined && (
              <div className="inline-flex flex-col items-center p-0.5 md:p-1">
                <button
                  type="button"
                  title="Phiếu pha chế"
                  onClick={() => onOpenMixingRecord?.(productionOrderId)}
                  className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
                >
                  <FileText />
                </button>
                <div className="w-[68px] md:w-[90px]">
                  <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                    Phiếu pha chế
                  </p>
                </div>
              </div>
            )}
          {isActionEnabled("view_material_summary") &&
            productionOrderId !== null &&
            productionOrderId !== undefined && (
              <div className="inline-flex flex-col items-center p-0.5 md:p-1">
                <button
                  type="button"
                  title="Tổng kết vật liệu"
                  onClick={() => onOpenMaterialSummary?.(productionOrderId)}
                  className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
                >
                  <ClipboardList />
                </button>
                <div className="w-[68px] md:w-[90px]">
                  <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                    Tổng kết vật liệu
                  </p>
                </div>
              </div>
            )}
          {isActionEnabled("create_semi_finished_product_label") && (
            <OpenFormButton
              icon={<Tags />}
              name="Tạo nhãn BTP"
              form={
                <SemiFinishedProductLabelForm
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_dispensed_material_label") && (
            <OpenFormButton
              icon={<Tags />}
              name="Tạo nhãn cấp phát"
              form={
                <DispensedMaterialLabelForm
                  data={productOrder}
                  productionOrderLines={productionOrderLines}
                />
              }
            />
          )}
          {isActionEnabled("create_production_order_deviation") && (
            <OpenFormButton
              icon={<Frown />}
              name="Sai lệch"
              form={
                <FormAddProductionOrderDeviation
                  productionOrder={productOrder}
                />
              }
            />
          )}
          {isActionEnabled("create_sampling_request") && (
            <OpenFormButton
              icon={<LuFileInput />}
              name="Tạo PYCLM"
              form={
                <FormCreateSamplingRequest
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("upload_production_guide") &&
            productionOrderId !== null &&
            productionOrderId !== undefined && (
              <ProductionGuideUploadButton
                productionOrderId={productionOrderId}
              />
            )}
          {isActionEnabled("create_equipment_monitoring_record") &&
            productionOrderId !== null &&
            productionOrderId !== undefined && (
              <div className="inline-flex flex-col items-center p-0.5 md:p-1">
                <button
                  type="button"
                  title="Nhập thông số thiết bị"
                  onClick={() =>
                    onOpenEquipmentMonitoringRecord?.(
                      productionOrderId,
                      productOrder.item_code ?? productOrder.item?.item_code,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
                >
                  <Settings2 />
                </button>
                <div className="w-[68px] md:w-[90px]">
                  <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                    Nhập thông số thiết bị
                  </p>
                </div>
              </div>
            )}
          {isActionEnabled("create_steam_sterilization_check") &&
            productionOrderId !== null &&
            productionOrderId !== undefined && (
              <div className="inline-flex flex-col items-center p-0.5 md:p-1">
                <button
                  type="button"
                  title="Theo dõi quá trình tiệt trùng"
                  onClick={() =>
                    onOpenSteamSterilizationChecks?.(productionOrderId)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
                >
                  <CookingPot />
                </button>
                <div className="w-[68px] md:w-[90px]">
                  <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                    Theo dõi quá trình tiệt trùng
                  </p>
                </div>
              </div>
            )}
          {isActionEnabled("create_filtration_check") &&
            productionOrderId !== null &&
            productionOrderId !== undefined && (
              <div className="inline-flex flex-col items-center p-0.5 md:p-1">
                <button
                  type="button"
                  title="Theo dõi quá trình lọc"
                  onClick={() => onOpenFiltrationChecks?.(productionOrderId)}
                  className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
                >
                  <Filter />
                </button>
                <div className="w-[68px] md:w-[90px]">
                  <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                    Theo dõi quá trình lọc
                  </p>
                </div>
              </div>
            )}
          {isActionEnabled("create_environment_check") && (
            <OpenFormButton
              icon={<ThermometerSun />}
              name="Kiểm tra nhiệt độ độ ẩm"
              form={
                <FormProductionOrderEnvironmentCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_line_clearance_check") && (
            <OpenFormButton
              icon={<ClipboardList />}
              name="Dọn quang dây chuyền"
              form={
                <FormProductionOrderLineClearanceCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_secondary_packaging_check") && (
            <OpenFormButton
              icon={<PackageCheck />}
              name="KT Đóng gói BBC2"
              form={
                <FormProductionOrderSecondaryPackagingCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_pre_secondary_packaging_check") && (
            <OpenFormButton
              icon={<PackageSearch />}
              name="KT BTP trước đóng gói BBC2"
              form={
                <FormPreSecondaryPackagingCheck
                  productionOrderId={productionOrderId}
                  dosageFormId={productionOrderDosageFormId}
                  dosageFormName={productionOrderDosageFormName}
                  dosageFormRequirement={productionOrderDosageFormRequirement}
                />
              }
            />
          )}
          {isActionEnabled("create_hygiene_check") && (
            <OpenFormButton
              icon={<Sparkles />}
              name="Kiểm tra vệ sinh"
              form={
                <FormProductionOrderHygieneCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_density_check") && (
            <OpenFormButton
              icon={<Beaker />}
              name="Kiểm tra tỉ trọng"
              form={
                <FormProductionOrderDensityCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_post_homogenization_granule_check") && (
            <OpenFormButton
              icon={<Beaker />}
              name="Kiểm tra cốm sau đồng nhất"
              form={
                <FormProductionOrderPostHomogenizationGranuleCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_friability_check") && (
            <OpenFormButton
              icon={<Percent />}
              name="Kiểm tra độ mài mòn"
              form={
                <FormProductionOrderFriabilityCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_cylinder_calibration") && (
            <OpenFormButton
              icon={<Ruler />}
              name="Hiệu chỉnh ống đong"
              form={
                <FormProductionOrderCylinderCalibration
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_disintegration_check") && (
            <OpenFormButton
              icon={<PillBottle />}
              name="Kiểm tra độ rã"
              form={
                <FormProductionOrderDisintegrationCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                />
              }
            />
          )}
          {isActionEnabled("create_vial_inspection_check") && (
            <OpenFormButton
              icon={<Eye />}
              name="Soi lọ"
              form={
                <FormProductionOrderVialInspectionCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_sensory_check") && (
            <OpenFormButton
              icon={<Soup />}
              name="Thử mùi vị"
              form={
                <FormProductionOrderSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_granule_package_sensory_check") && (
            <OpenFormButton
              icon={<GiChipsBag />}
              name="Kiểm tra cảm quan gói cốm"
              form={
                <FormProductionOrderGranulePackageSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_solution_package_sensory_check") && (
            <OpenFormButton
              icon={<ShoppingBag />}
              name="Kiểm tra cảm quan gói dịch"
              form={
                <FormProductionOrderSolutionPackageSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_tablet_weight_sensory_check") && (
            <OpenFormButton
              icon={<Tablets />}
              name="Kiểm tra cảm quan viên nén"
              form={
                <FormProductionOrderTabletWeightSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_capsule_sensory_check") && (
            <OpenFormButton
              icon={<Pill />}
              name="Kiểm tra cảm quan viên nang"
              form={
                <FormProductionOrderCapsuleSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_bottle_sensory_check") && (
            <OpenFormButton
              icon={<BottleWine />}
              name="Kiểm tra cảm quan lọ"
              form={
                <FormProductionOrderBottleSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_ampoule_sensory_check") && (
            <OpenFormButton
              icon={<Layers />}
              name="Kiểm tra cảm quan ống bẻ"
              form={
                <FormProductionOrderAmpouleSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isBlisterSensoryCheckEnabled && (
            <OpenFormButton
              icon={<Layers />}
              name="Kiểm tra cảm quan vỉ"
              form={
                <FormProductionOrderBlisterSensoryCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_hard_capsule_leakage_check") && (
            <OpenFormButton
              icon={<Pill />}
              name="Kiểm tra rò rỉ nang cứng"
              form={
                <FormProductionOrderHardCapsuleLeakageCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_shell_weight_check") && (
            <OpenFormButton
              icon={<GiChipsBag />}
              name="Kiểm tra khối lượng vỏ"
              form={
                <FormProductionOrderShellWeightCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_granule_package_weight_check") && (
            <OpenFormButton
              icon={<Weight />}
              name="Kiểm tra khối lượng gói cốm"
              form={
                <FormProductionOrderGranuleBagWeightInput
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_solution_package_weight_check") && (
            <OpenFormButton
              icon={<Weight />}
              name="Kiểm tra khối lượng gói dịch"
              form={
                <FormProductionOrderSolutionPackageWeightCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                />
              }
            />
          )}
          {isActionEnabled("create_tube_weight_check") && (
            <OpenFormButton
              icon={<Weight />}
              name="Kiểm tra khối lượng tuýp"
              form={
                <FormProductionOrderSolutionPackageWeightCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  containerType="tube"
                />
              }
            />
          )}
          {isActionEnabled("create_capsule_gross_weight_check") && (
            <OpenFormButton
              icon={<Pill />}
              name="Kiểm tra khối lượng viên nang cả vỏ"
              form={
                <FormProductionOrderCapsuleGrossWeightCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_granule_in_bag_weight_check") && (
            <OpenFormButton
              icon={<PackageSearch />}
              name="Kiểm tra khối lượng cốm trong gói"
              form={
                <FormProductionOrderGranulesInBagWeightCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_tablet_weight_check") && (
            <OpenFormButton
              icon={<Tablets />}
              name="Kiểm tra khối lượng viên nén"
              form={
                <FormProductionOrderTabletWeightCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isTabletHardnessCheckEnabled && (
            <OpenFormButton
              icon={<Tablets />}
              name="Kiểm tra độ cứng viên nén"
              form={
                <FormProductionOrderHardnessCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_tablet_thickness_check") && (
            <OpenFormButton
              icon={<Ruler />}
              name="Kiểm tra độ dày viên nén"
              form={
                <FormProductionOrderTabletThicknessCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_film_coated_tablet_weight_check") && (
            <OpenFormButton
              icon={<Tablets />}
              name="Kiểm tra khối lượng viên nén bao phim"
              form={
                <FormProductionOrderFilmCoatedTabletWeightCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_granule_package_leak_tightness_check") && (
            <OpenFormButton
              icon={<PackageCheck />}
              name="Kiểm tra độ kín gói cốm"
              form={
                <FormGranulePackageLeakTightnessCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_blister_leak_tightness_check") && (
            <OpenFormButton
              icon={<PackageCheck />}
              name="Kiểm tra độ kín vỉ"
              form={
                <FormBlisterLeakTightnessCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_bottle_leak_tightness_check") && (
            <OpenFormButton
              icon={<FlaskConical />}
              name="Kiểm tra độ kín lọ"
              form={
                <FormBottleLeakTightnessCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_tablet_vial_leak_tightness_check") && (
            <OpenFormButton
              icon={<PillBottle />}
              name="Kiểm tra độ kín lọ viên"
              form={
                <FormBottleLeakTightnessCheck
                  productionOrderId={productionOrderId}
                  dosageFormStage="Lọ viên"
                  title="Kiểm tra độ kín lọ viên"
                  requirementText="Màng seal dính chặt, Không có hiện trường bong tróc, xấy hở, Lót seal không bị đen, Lọ và nắp sạch không có bavia"
                />
              }
            />
          )}
          {isActionEnabled("create_ampoule_leak_tightness_check") && (
            <OpenFormButton
              icon={<FlaskConical />}
              name="Kiểm tra độ kín ống bẻ"
              form={
                <FormBottleLeakTightnessCheck
                  productionOrderId={productionOrderId}
                  dosageFormStage="Ống bẻ"
                  title="Kiểm tra độ kín ống bẻ"
                  requirementText="Độ kín: Kiểm tra bằng máy đo độ kín, hút chân không ở -60 kPa trong 30 giây. Vỉ không được có ống rò rỉ dịch."
                />
              }
            />
          )}
          {isActionEnabled("create_solution_package_leak_tightness_check") && (
            <OpenFormButton
              icon={<ShoppingBag />}
              name="Kiểm tra độ kín gói dịch"
              form={
                <FormSolutionPackageLeakTightnessCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={productionSpecification}
                />
              }
            />
          )}
          {isActionEnabled("create_ten_shell_weight_check") && (
            <OpenFormButton
              icon={<Scale />}
              name="Khối lượng 10 vỏ"
              form={
                <FormProductionOrderTenShellWeightCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_spray_dose_check") && (
            <OpenFormButton
              icon={<SprayCan />}
              name="Kiểm tra số lượng liều xịt"
              form={
                <FormProductionOrderSprayDoseCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  productionSpecification={volumeRequirementSource}
                />
              }
            />
          )}
          {isActionEnabled("create_vial_volume_check") && (
            <OpenFormButton
              icon={<BottleWine />}
              name="Kiểm tra thể tích lọ"
              form={
                <FormProductionOrderVialVolumeCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  dosageFormStage="Lọ dịch"
                  productionSpecification={volumeRequirementSource}
                />
              }
            />
          )}
          {isVialWeightCheckEnabled && (
            <OpenFormButton
              icon={<Weight />}
              name="Kiểm tra khối lượng lọ"
              form={
                <FormProductionOrderVialSolutionMassCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  checkType="vial"
                />
              }
            />
          )}
          {isVialSolutionMassCheckEnabled && (
            <OpenFormButton
              icon={<Weight />}
              name="Kiểm tra khối lượng dịch trong lọ"
              form={
                <FormProductionOrderVialSolutionMassCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  checkType="solution"
                />
              }
            />
          )}
          {isTubeSolutionMassCheckEnabled && (
            <OpenFormButton
              icon={<Weight />}
              name="Kiểm tra khối lượng dịch trong tuýp"
              form={
                <FormProductionOrderVialSolutionMassCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  checkType="tube"
                />
              }
            />
          )}
          {isActionEnabled("create_package_volume_check") && (
            <OpenFormButton
              icon={<PackagePlus />}
              name="Kiểm tra thể tích gói"
              form={
                <FormProductionOrderVialVolumeCheck
                  productionOrderId={productionOrderId}
                  itemCode={
                    productOrder.item_code ?? productOrder.item?.item_code
                  }
                  packageType="gói"
                  dosageFormStage="Gói dịch"
                  title="Kiểm tra thể tích gói"
                  productionSpecification={volumeRequirementSource}
                />
              }
            />
          )}
          {isActionEnabled("create_date_check") && (
            <div className="inline-flex flex-col items-center p-0.5 md:p-1">
              <button
                type="button"
                title="Theo dõi In Date"
                onClick={() => onOpenDateChecks?.(productionOrderId)}
                className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              >
                <FileUp />
              </button>
              <div className="w-[68px] md:w-[90px]">
                <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                  Theo dõi In Date
                </p>
              </div>
            </div>
          )}
          {isActionEnabled("create_packaging_slip_attachment") && (
            <OpenFormButton
              icon={<FileUp />}
              name="Hình ảnh phiếu đóng gói"
              form={
                <FormProductionOrderAttachment
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_registration_number_attachment") && (
            <OpenFormButton
              icon={<FileUp />}
              name="Hình ảnh số đăng ký"
              form={
                <FormProductionOrderAttachment
                  productionOrderId={productionOrderId}
                  attachmentType="registration_number"
                  title="Hình ảnh số đăng ký"
                />
              }
            />
          )}
          {isActionEnabled("create_finished_product_summary") && (
            <OpenFormButton
              icon={<PackageCheck />}
              name="Tổng kết thành phẩm"
              form={
                <FormProductionOrderFinishedProductSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_post_secondary_packaging_summary") &&
          onOpenPostSecondaryPackagingSummaries ? (
            <div className="inline-flex flex-col items-center p-0.5 md:p-1">
              <button
                type="button"
                title="Tổng kết BTP hoàn thiện"
                onClick={() =>
                  onOpenPostSecondaryPackagingSummaries(productionOrderId)
                }
                className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              >
                <Boxes />
              </button>
              <div className="w-[82px] md:w-[104px]">
                <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                  Tổng kết BTP hoàn thiện
                </p>
              </div>
            </div>
          ) : null}
          {isActionEnabled("create_primary_packaging_confirmation") && (
            <OpenFormButton
              icon={<PackageCheck />}
              name="Xác nhận trước đóng gói bao bì cấp 1"
              form={
                <FormPrimaryPackagingConfirmation
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_extraction_summary") && (
            <OpenFormButton
              icon={<Droplets />}
              name="Tổng kết chiết cao"
              form={
                <FormProductionOrderExtractionSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_herbal_powder_summary") && (
            <OpenFormButton
              icon={<Wheat />}
              name="Tổng kết bột dược liệu"
              form={
                <FormProductionOrderExtractionSummary
                  productionOrderId={productionOrderId}
                  processStage="Sản xuất bột dược liệu"
                />
              }
            />
          )}
          {isActionEnabled("create_tableting_summary") && (
            <OpenFormButton
              icon={<Tablets />}
              name="Tổng kết dập viên"
              form={
                <FormProductionOrderTabletingSummary
                  productionOrderId={productionOrderId}
                  stage="Dập viên"
                  title="Tổng kết dập viên"
                />
              }
            />
          )}
          {isActionEnabled("create_granule_bagging_summary") && (
            <OpenFormButton
              icon={<ClipboardList />}
              name="Tổng kết đóng túi cốm"
              form={
                <FormProductionOrderGranuleBaggingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isCapsuleFillingSummaryEnabled && (
            <OpenFormButton
              icon={<Pill />}
              name="Tổng kết đóng nang"
              form={
                <FormProductionOrderCapsuleFillingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_vial_filling_summary") && (
            <OpenFormButton
              icon={<PackageOpen />}
              name="Tổng kết đóng lọ"
              form={
                <FormProductionOrderVialFillingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_tablet_vial_filling_summary") && (
            <OpenFormButton
              icon={<PillBottle />}
              name="Tổng kết đóng lọ viên"
              form={
                <FormProductionOrderTabletVialFillingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_solution_bagging_summary") && (
            <OpenFormButton
              icon={<ShoppingBag />}
              name="Tổng kết đóng gói dịch"
              form={
                <FormProductionOrderSolutionBaggingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_ampoule_packing_summary") && (
            <OpenFormButton
              icon={<PackageOpen />}
              name="Tổng kết đóng ống bẻ"
              form={
                <FormProductionOrderAmpoulePackingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_blister_packing_summary") && (
            <OpenFormButton
              icon={<Layers />}
              name="Tổng kết ép vỉ"
              form={
                <FormProductionOrderBlisterPackingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_film_coating_summary") && (
            <OpenFormButton
              icon={<Paintbrush />}
              name="Tổng kết bao phim"
              form={
                <FormProductionOrderFilmCoatingSummary
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_factory_release_review") && (
            <OpenFormButton
              icon={<FileCheck />}
              name="Xét duyệt xuất xưởng"
              form={
                <FormProductionOrderFactoryReleaseReview
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_sampling_record") && (
            <OpenFormButton
              icon={<FlaskConical />}
              name="Lấy mẫu"
              form={
                <FormProductionOrderSamplingRecord
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_disinfectant_preparation") && (
            <OpenFormButton
              icon={<ShieldCheck />}
              name="Pha chế chất sát khuẩn"
              form={
                <FormProductionOrderDisinfectantPreparation
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
          {isActionEnabled("create_post_preparation_solution_check") && (
            <OpenFormButton
              icon={<Beaker />}
              name="Kiểm tra dịch sau pha chế"
              form={
                <FormProductionOrderPostPreparationSolutionCheck
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border bg-white p-3 text-center shadow-md md:gap-4 md:p-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={productOrder.production_order_code}
        />
        <FieldDisplay lable="Mã sản phẩm" value={productOrder.item_code} />
        <FieldDisplay
          lable="Trạng thái"
          value={formatProductionOrderStatus(productOrder.status)}
        />
        <FieldDisplay
          lable="Loại"
          value={formatProductionOrderType(productOrder.type)}
        />
        <FieldDisplay
          lable="Số lượng kế hoạch"
          value={`${formatNumber(productOrder.planned_quatity)} ${productOrder.unit ?? ""}`}
        />
        <FieldDisplay lable="Kho" value={productOrder.warehouse} />
        <FieldDisplay
          lable="Ngày tạo"
          value={formatDate(productOrder.creation_date)}
        />
        <FieldDisplay
          lable="Ngày bắt đầu"
          value={formatDate(productOrder.start_date)}
        />
        <FieldDisplay
          lable="Ngày sản xuất"
          value={formatDate(productOrder.date_manufacture)}
        />
        <FieldDisplay
          lable="Hạn sử dụng"
          value={formatDate(productOrder.expire_date)}
        />
        <FieldDisplay
          lable="Quy cách đóng gói"
          value={productOrder.packing_specification ?? ""}
        />
        <FieldDisplay lable="Ghi chú" value={productOrder.remarks ?? ""} />
        <FieldDisplay
          lable="Nội dung thay đổi"
          value={productOrder.change_content ?? ""}
        />
        <FieldDisplay lable="Số đăng ký" value={registrationNumber} />
        <SamplingRequestStatus samplingRequest={productOrder.pyclm} />
        {productionOrderId !== null && productionOrderId !== undefined ? (
          <ProductionGuideStatus productionOrderId={productionOrderId} />
        ) : null}
        <ProductionOrderDocumentControlStatus
          documentControl={productOrder.documentControl}
        />
      </div>
      {isProductionOrderFeatureEnabled(
        featureConfig,
        "section",
        "steam_sterilization_checks",
      ) &&
        productionOrderId !== null &&
        productionOrderId !== undefined && (
          <SteamSterilizationChecksView
            id={productionOrderId}
            embedded
            onSelectCheck={onOpenSteamSterilizationCheckDetail}
          />
        )}
      {isProductionOrderFeatureEnabled(
        featureConfig,
        "section",
        "post_secondary_packaging_summaries",
      ) &&
        productionOrderId !== null &&
        productionOrderId !== undefined && (
          <PostSecondaryPackagingSummariesView
            id={productionOrderId}
            embedded
            onSelectSummary={onOpenPostSecondaryPackagingSummaryDetail}
          />
        )}
      {isProductionOrderFeatureEnabled(
        featureConfig,
        "section",
        "filtration_checks",
      ) &&
        productionOrderId !== null &&
        productionOrderId !== undefined && (
          <FiltrationChecksView
            id={productionOrderId}
            embedded
            onSelectCheck={onOpenFiltrationCheckDetail}
          />
        )}
    </div>
  );
}
