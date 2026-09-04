"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
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
import type { ProductionOrderFactoryReleaseReview } from "../../types";
import { formatDateTime, formatText, getUserLabel } from "../../utils";
import FormProductionOrderFactoryReleaseReview from "../form-production-order-factory-release-review/form-production-order-factory-release-review";

const detailFields: Array<{
  key: keyof ProductionOrderFactoryReleaseReview;
  label: string;
}> = [
  { key: "production_order_id", label: "Mã lệnh sản xuất" },
  { key: "registration_number", label: "Số đăng ký/số công bố" },
  { key: "raw_material_test_result", label: "Kết quả nguyên liệu đầu vào" },
  { key: "water_test_result", label: "Kết quả kiểm nghiệm nước" },
  { key: "compressed_air_test_result", label: "Kết quả khí nén" },
  {
    key: "filter_integrity_test_result",
    label: "Kết quả thử nguyên vẹn màng lọc",
  },
  { key: "packaging_inspection_result", label: "Kết quả kiểm tra bao bì" },
  { key: "finished_product_test_result", label: "Kết quả kiểm nghiệm thành phẩm" },
  { key: "sterilization_result", label: "Kết quả tiệt trùng" },
  { key: "online_particle_result", label: "Kết quả tiểu phân online" },
  { key: "yield_quantity", label: "Sản lượng" },
  { key: "deviation", label: "Sai lệch" },
  { key: "environment_monitoring_result", label: "Kết quả giám sát môi trường" },
];

function FactoryReleaseReviewDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FactoryReleaseReviewDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderFactoryReleaseReview>(
    API_ROUTES.productionOrders.factoryReleaseReviewDetail(id),
    () => productionOrdersService.fetchFactoryReleaseReviewById(id),
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.factoryReleaseReviews(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteFactoryReleaseReview(data.id);
      toast.success("Đã xóa xét duyệt xuất xưởng.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa xét duyệt xuất xưởng.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Xét duyệt xuất xưởng" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi xét duyệt xuất xưởng.
        </div>
      </div>
    );
  }

  if (!data) {
    return <FactoryReleaseReviewDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Xét duyệt xuất xưởng #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
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
        <DialogContent className="md:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Cập nhật xét duyệt xuất xưởng
            </DialogTitle>
          </DialogHeader>
          <FormProductionOrderFactoryReleaseReview
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
            <DialogTitle>Xác nhận xóa xét duyệt xuất xưởng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi xét duyệt xuất xưởng này không?
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
        {detailFields.map((field) => (
          <FieldDisplay
            key={field.key}
            lable={field.label}
            value={formatText(data[field.key] as string | number | null)}
          />
        ))}
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Người duyệt"
          value={getUserLabel(data.approvedBy ?? data.createdBy)}
        />
      </div>
    </div>
  );
}
