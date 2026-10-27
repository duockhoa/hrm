"use client";

import * as React from "react";
import {
  FileCheck,
  FileUp,
  Loader2,
  MoreVertical,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isProductionOrderFeatureEnabled,
  type ProductionOrderFeatureConfig,
} from "@/features/features";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import useUserStore from "@/store/user.store";

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

export default function ProductionOrderDocumentControlActions({
  productionOrderId,
  featureConfig,
  variant = "buttons",
  lotLabel,
}: {
  productionOrderId?: string | number | null;
  featureConfig?: ProductionOrderFeatureConfig;
  variant?: "buttons" | "menu";
  lotLabel?: string;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const { data: permissions, error: permissionsError } = useSWR(
    userId ? [API_ROUTES.users.myPermissions, userId] : null,
    () => userService.fetchMyPermissions(),
  );
  const [confirmingActionKey, setConfirmingActionKey] =
    React.useState<DocumentControlActionKey | null>(null);
  const [submittingAction, setSubmittingAction] =
    React.useState<DocumentControlActionKey | null>(null);

  const documentControlActions: Array<{
    key: DocumentControlActionKey;
    permissionKey?: string;
    label: string;
    title: string;
    icon: React.ReactNode;
    submit: (
      id: string | number,
    ) => Promise<ProductionOrderDocumentControl | null>;
  }> = [
    {
      key: "issue_batch_record",
      permissionKey: "production-orders.document-control.update",
      label: "Cấp hồ sơ lô giấy",
      title: "Cấp hồ sơ lô giấy",
      icon: <FileUp />,
      submit: productionOrdersService.issueProductionOrderBatchRecord,
    },
    {
      key: "receive_batch_record",
      permissionKey: "production-orders.document-control.update",
      label: "Nhận hồ sơ lô giấy",
      title: "Nhận hồ sơ lô giấy",
      icon: <FileCheck />,
      submit: productionOrdersService.receiveProductionOrderBatchRecord,
    },
    {
      key: "receive_warehouse_release",
      permissionKey: "production-orders.document-control.update",
      label: "Nhận phiếu xuất kho",
      title: "Nhận phiếu xuất kho",
      icon: <PackageCheck />,
      submit: productionOrdersService.receiveProductionOrderWarehouseRelease,
    },
    {
      key: "receive_test_certificate",
      permissionKey: "production-orders.document-control.update",
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
      ) &&
      (!action.permissionKey ||
        Boolean(
          !permissionsError &&
            permissions?.permissionKeys.includes(action.permissionKey),
        )),
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

  if (enabledDocumentControlActions.length === 0) return null;

  return (
    <>
      {variant === "menu" ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              aria-label={`Kiểm soát tài liệu${lotLabel ? ` lô ${lotLabel}` : ""}`}
              title="Kiểm soát tài liệu"
              disabled={!productionOrderId || submittingAction !== null}
            >
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            {enabledDocumentControlActions.map((action) => (
              <DropdownMenuItem
                key={action.key}
                onSelect={() => setConfirmingActionKey(action.key)}
                disabled={!productionOrderId || submittingAction !== null}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        enabledDocumentControlActions.map((action) => (
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
        ))
      )}

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
              xuất{lotLabel ? ` của lô ${lotLabel}` : " này"} không?
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
