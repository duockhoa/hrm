"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { mutate as mutateGlobal } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderSemiFinishedProductSummary } from "../../types";
import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";
import {
  formatDateTime,
  formatQuantityWithUnit,
  formatText,
  getUserLabel,
} from "../../utils";

function SemiFinishedProductSummaryDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 w-[220px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

type SummaryFormConfig = {
  title: string;
  inputQuantityLabel: string;
  inputQuantityUnit: string;
  packedQuantityLabel: string;
  packedQuantityUnit: string;
  leftoverQuantityLabel: string;
  leftoverQuantityUnit: string;
  wasteQuantityLabel: string;
  wasteQuantityUnit: string;
  loadQuantityLabel?: string;
  loadQuantityUnit?: string;
  showLoadQuantity?: boolean;
};

const getSummaryFormConfig = (
  stage: string | null | undefined,
): SummaryFormConfig => {
  switch (stage) {
    case "Đóng nang":
      return {
        title: "Tổng kết đóng nang",
        inputQuantityLabel: "Khối lượng cốm ban đầu",
        inputQuantityUnit: "kg",
        packedQuantityLabel: "Khối lượng viên nang đóng được",
        packedQuantityUnit: "kg",
        leftoverQuantityLabel: "Khối lượng cốm dư",
        leftoverQuantityUnit: "kg",
        wasteQuantityLabel: "Khối lượng cốm hỏng",
        wasteQuantityUnit: "kg",
      };
    case "Đóng túi cốm":
      return {
        title: "Tổng kết đóng túi cốm",
        inputQuantityLabel: "Khối lượng cốm ban đầu",
        inputQuantityUnit: "kg",
        packedQuantityLabel: "Số lượng gói đóng được theo máy đóng",
        packedQuantityUnit: "Túi",
        leftoverQuantityLabel: "Khối lượng cốm dư",
        leftoverQuantityUnit: "kg",
        wasteQuantityLabel: "Khối lượng cốm hỏng",
        wasteQuantityUnit: "kg",
      };
    case "Đóng lọ":
      return {
        title: "Tổng kết đóng lọ",
        inputQuantityLabel: "Lượng dịch ban đầu",
        inputQuantityUnit: "Lít",
        packedQuantityLabel: "Số lọ đóng được theo máy đóng",
        packedQuantityUnit: "Lọ",
        leftoverQuantityLabel: "Lượng dịch dư",
        leftoverQuantityUnit: "Lít",
        wasteQuantityLabel: "Lượng dịch hỏng",
        wasteQuantityUnit: "Lít",
      };
    case "Đóng lọ viên":
      return {
        title: "Tổng kết đóng lọ viên",
        inputQuantityLabel: "Khối lượng viên ban đầu",
        inputQuantityUnit: "kg",
        packedQuantityLabel: "Số lọ đóng được",
        packedQuantityUnit: "lọ",
        leftoverQuantityLabel: "Khối lượng viên dư",
        leftoverQuantityUnit: "kg",
        wasteQuantityLabel: "Khối lượng viên hỏng",
        wasteQuantityUnit: "kg",
        loadQuantityLabel: "Tổng số sọt lọ",
        loadQuantityUnit: "sọt",
      };
    case "Đóng túi dịch":
      return {
        title: "Tổng kết đóng túi dịch",
        inputQuantityLabel: "Lượng dịch ban đầu",
        inputQuantityUnit: "Lít",
        packedQuantityLabel: "Số túi đóng được theo máy đóng",
        packedQuantityUnit: "Túi",
        leftoverQuantityLabel: "Lượng dịch dư",
        leftoverQuantityUnit: "Lít",
        wasteQuantityLabel: "Lượng dịch hỏng",
        wasteQuantityUnit: "Lít",
      };
    case "Đóng gói dịch":
      return {
        title: "Tổng kết đóng gói dịch",
        inputQuantityLabel: "Lượng dịch trước đóng",
        inputQuantityUnit: "Lít",
        packedQuantityLabel: "Số lượng gói đóng được theo máy đóng",
        packedQuantityUnit: "Gói",
        leftoverQuantityLabel: "Thể tích dịch dư",
        leftoverQuantityUnit: "Lít",
        wasteQuantityLabel: "Thể tích dịch hỏng",
        wasteQuantityUnit: "Lít",
        loadQuantityLabel: "Số sọt đóng được",
        loadQuantityUnit: "sọt",
      };
    case "Đóng ống bẻ":
      return {
        title: "Tổng kết đóng ống bẻ",
        inputQuantityLabel: "Thể tích dịch ban đầu",
        inputQuantityUnit: "Lít",
        packedQuantityLabel: "Số vỉ đóng được theo máy đóng",
        packedQuantityUnit: "Vỉ",
        leftoverQuantityLabel: "Thể tích dịch dư",
        leftoverQuantityUnit: "Lít",
        wasteQuantityLabel: "Thể tích dịch hỏng",
        wasteQuantityUnit: "Lít",
        loadQuantityLabel: "Số sọt đóng được",
        loadQuantityUnit: "sọt",
      };
    case "Ép vỉ":
      return {
        title: "Tổng kết ép vỉ",
        inputQuantityLabel: "Số lượng viên ban đầu",
        inputQuantityUnit: "Kg",
        packedQuantityLabel: "Số vỉ ép được theo máy ép",
        packedQuantityUnit: "Vỉ",
        leftoverQuantityLabel: "Số lượng viên dư",
        leftoverQuantityUnit: "Kg",
        wasteQuantityLabel: "Số lượng viên hỏng",
        wasteQuantityUnit: "Kg",
      };
    case "Bao phim":
      return {
        title: "Tổng kết bao phim",
        inputQuantityLabel: "Khối lượng viên ban đầu",
        inputQuantityUnit: "Kg",
        packedQuantityLabel: "Khối lượng viên bao được",
        packedQuantityUnit: "Kg",
        leftoverQuantityLabel: "Khối lượng viên dư",
        leftoverQuantityUnit: "Kg",
        wasteQuantityLabel: "Khối lượng viên hỏng",
        wasteQuantityUnit: "Kg",
      };
    default:
      return {
        title: "Tổng kết dập viên",
        inputQuantityLabel: "Khối lượng cốm ban đầu",
        inputQuantityUnit: "kg",
        packedQuantityLabel: "Khối lượng viên đóng được",
        packedQuantityUnit: "kg",
        leftoverQuantityLabel: "Khối lượng cốm dư",
        leftoverQuantityUnit: "kg",
        wasteQuantityLabel: "Khối lượng cốm hỏng",
        wasteQuantityUnit: "kg",
      };
  }
};

export default function SemiFinishedProductSummaryDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { data, error } = useSWR<ProductionOrderSemiFinishedProductSummary>(
    API_ROUTES.productionOrders.semiFinishedProductSummaryDetail(id),
    () => productionOrdersService.fetchSemiFinishedProductSummaryById(id),
  );
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.semiFinishedProductSummaries(
        data.production_order_id,
      )
    : null;

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteSemiFinishedProductSummary(data.id);
      toast.success("Đã xóa tổng kết sản lượng bán thành phẩm.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa tổng kết sản lượng bán thành phẩm.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Tổng kết sản lượng bán thành phẩm"
          onClose={onClose}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy tổng kết sản lượng bán thành phẩm.
        </div>
      </div>
    );
  }

  if (!data) {
    return <SemiFinishedProductSummaryDetailSkeleton />;
  }

  const formConfig = getSummaryFormConfig(data.stage);

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Tổng kết sản lượng bán thành phẩm #${data.id}`}
        actions={
          <>
            <Button size="sm" type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
        onClose={onClose}
      />

      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Cập nhật tổng kết sản lượng bán thành phẩm
            </DialogTitle>
          </DialogHeader>
          <FormProductionOrderTabletingSummary
            productionOrderId={data.production_order_id ?? ""}
            stage={data.stage ?? "Dập viên"}
            {...formConfig}
            data={data}
            onClose={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              Xác nhận xóa tổng kết sản lượng bán thành phẩm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi tổng kết sản lượng bán thành
              phẩm này không?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay lable="Giai đoạn" value={formatText(data.stage)} />
        <FieldDisplay
          lable={formConfig.inputQuantityLabel}
          value={formatQuantityWithUnit(data.input_quantity, data.input_unit)}
        />
        <FieldDisplay
          lable={formConfig.packedQuantityLabel}
          value={formatQuantityWithUnit(data.packed_quantity, data.packed_unit)}
        />
        <FieldDisplay
          lable={formConfig.leftoverQuantityLabel}
          value={formatQuantityWithUnit(
            data.leftover_quantity,
            data.leftover_unit,
          )}
        />
        <FieldDisplay
          lable={formConfig.wasteQuantityLabel}
          value={formatQuantityWithUnit(data.waste_quantity, data.waste_unit)}
        />
        {formConfig.showLoadQuantity !== false ? (
          <FieldDisplay
            lable={formConfig.loadQuantityLabel ?? "Số tải bán thành phẩm"}
            value={formatQuantityWithUnit(
              data.load_quantity,
              data.load_quantity === null ||
                data.load_quantity === undefined ||
                data.load_quantity === ""
                ? null
                : data.load_unit ?? formConfig.loadQuantityUnit ?? "tải",
            )}
          />
        ) : null}
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
