"use client";

import { type FormEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import { ClipboardCheck, Pencil, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import filterCatalogsService from "@/services/filter-catalogs.service";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import type { FilterCatalog } from "@/features/filter-catalogs";
import type { FiltrationCheck } from "../types";
import FiltrationCheckForm from "./filtration-check-form";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function FiltrationCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessCheckOpen, setIsProcessCheckOpen] = useState(false);
  const [isSavingProcessCheck, setIsSavingProcessCheck] = useState(false);
  const [isPostFilterCheckOpen, setIsPostFilterCheckOpen] = useState(false);
  const [isSavingPostFilterCheck, setIsSavingPostFilterCheck] = useState(false);
  const [postFilterAppearanceResult, setPostFilterAppearanceResult] =
    useState("");
  const [updatingFilteringTime, setUpdatingFilteringTime] = useState<
    "filtering_started_at" | "filtering_finished_at" | null
  >(null);
  const [filteringTimeAction, setFilteringTimeAction] = useState<{
    field: "filtering_started_at" | "filtering_finished_at";
    label: string;
  } | null>(null);
  const detailKey = API_ROUTES.productionOrders.filtrationCheckDetail(id);
  const { data, error } = useSWR<FiltrationCheck>(detailKey, () =>
    productionOrdersService.fetchFiltrationCheckById(id),
  );
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR<{
    id?: number;
  }>(API_ROUTES.users.me, userService.fetcherMe);
  const { data: filterCatalogs } = useSWR<FilterCatalog[]>(
    API_ROUTES.filterCatalogs.base,
    filterCatalogsService.fetchFilterCatalogs,
  );
  const selectedFilterCatalog = (filterCatalogs ?? []).find(
    (filterCatalog) => filterCatalog.id === data?.filter_membrane_id,
  );
  const postFilterIntegrityRequirement = selectedFilterCatalog
    ? selectedFilterCatalog.integrity_requirement ?? ""
    : data?.post_filter_integrity_requirement ?? "";
  const postFilterMembraneAppearanceRequirement = selectedFilterCatalog
    ? selectedFilterCatalog.post_filter_sensory_requirement ?? ""
    : data?.post_filter_membrane_appearance_requirement ?? "";
  const hasPostFilterIntegrityRequirement =
    postFilterIntegrityRequirement.trim().length > 0;
  const hasPostFilterMembraneAppearanceRequirement =
    postFilterMembraneAppearanceRequirement.trim().length > 0;

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa phiếu kiểm tra quá trình lọc này?")) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteFiltrationCheck(id);
      if (data?.production_order_id) {
        await mutate(API_ROUTES.productionOrders.filtrationChecks(data.production_order_id));
      }
      toast.success("Đã xóa kiểm tra quá trình lọc.");
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ?? "Không thể xóa kiểm tra quá trình lọc.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcessCheckSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!currentUser?.id) {
      toast.error("Không tìm thấy thông tin người dùng hiện tại.");
      return;
    }

    const values = new FormData(event.currentTarget);
    const textValue = (key: string) => String(values.get(key) ?? "").trim();
    const rinseWaterVolume = textValue("rinse_water_volume_liters");
    const startedAt = textValue("filtering_started_at");
    const finishedAt = textValue("filtering_finished_at");
    const payload = {
      rinse_water_volume_liters: rinseWaterVolume
        ? Number(rinseWaterVolume.replace(",", "."))
        : null,
      filtering_started_at: startedAt ? new Date(startedAt).toISOString() : null,
      filtering_finished_at: finishedAt
        ? new Date(finishedAt).toISOString()
        : null,
      filtered_by_id: currentUser.id,
    };

    if (Number.isNaN(payload.rinse_water_volume_liters)) {
      toast.error("Lượng nước tráng không hợp lệ.");
      return;
    }

    try {
      setIsSavingProcessCheck(true);
      await productionOrdersService.updateFiltrationCheck(id, payload);
      await mutate(detailKey);
      if (data?.production_order_id) {
        await mutate(API_ROUTES.productionOrders.filtrationChecks(data.production_order_id));
      }
      toast.success("Đã lưu kiểm tra trong quá trình lọc.");
      setIsProcessCheckOpen(false);
    } catch (saveError: any) {
      toast.error(
        saveError?.response?.data?.message ??
          "Không thể lưu kiểm tra trong quá trình lọc.",
      );
    } finally {
      setIsSavingProcessCheck(false);
    }
  };

  const handleSetFilteringTime = async (
    field: "filtering_started_at" | "filtering_finished_at",
    label: string,
  ) => {
    try {
      setUpdatingFilteringTime(field);
      await productionOrdersService.updateFiltrationCheck(id, {
        [field]: new Date().toISOString(),
      });
      await mutate(detailKey);
      if (data?.production_order_id) {
        await mutate(API_ROUTES.productionOrders.filtrationChecks(data.production_order_id));
      }
      toast.success(`Đã lưu ${label.toLocaleLowerCase("vi-VN")}.`);
      setFilteringTimeAction(null);
    } catch (saveError: any) {
      toast.error(
        saveError?.response?.data?.message ?? `Không thể lưu ${label.toLocaleLowerCase("vi-VN")}.`,
      );
    } finally {
      setUpdatingFilteringTime(null);
    }
  };

  const handlePostFilterCheckSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!currentUser?.id) {
      toast.error("Không tìm thấy thông tin người dùng hiện tại.");
      return;
    }

    const values = new FormData(event.currentTarget);
    const textValue = (key: string) => String(values.get(key) ?? "").trim();
    const tankResidualVolume = textValue("tank_residual_volume_liters");
    const payload = {
      tank_residual_volume_liters: tankResidualVolume
        ? Number(tankResidualVolume.replace(",", "."))
        : null,
      post_filter_integrity_requirement:
        textValue("post_filter_integrity_requirement") || null,
      post_filter_integrity_result:
        textValue("post_filter_integrity_result") || null,
      post_filter_membrane_appearance_requirement:
        textValue("post_filter_membrane_appearance_requirement") || null,
      post_filter_membrane_appearance_result:
        textValue("post_filter_membrane_appearance_result") || null,
      inspected_after_filter_by_id: currentUser.id,
    };

    if (Number.isNaN(payload.tank_residual_volume_liters)) {
      toast.error("Dịch tồn bồn không hợp lệ.");
      return;
    }

    try {
      setIsSavingPostFilterCheck(true);
      await productionOrdersService.updateFiltrationCheck(id, payload);
      await mutate(detailKey);
      if (data?.production_order_id) {
        await mutate(API_ROUTES.productionOrders.filtrationChecks(data.production_order_id));
      }
      toast.success("Đã lưu kiểm tra sau lọc.");
      setIsPostFilterCheckOpen(false);
    } catch (saveError: any) {
      toast.error(
        saveError?.response?.data?.message ?? "Không thể lưu kiểm tra sau lọc.",
      );
    } finally {
      setIsSavingPostFilterCheck(false);
    }
  };

  if (error) {
    return <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md"><DetailPanelHeader title="Chi tiết kiểm tra quá trình lọc" onClose={onClose} /><div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">Không tìm thấy bản ghi kiểm tra quá trình lọc.</div></div>;
  }

  if (!data) {
    return <div className="w-full max-w-4xl space-y-3 rounded border bg-white p-4 shadow-md">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div>;
  }

  const detailFieldEntries: Array<[string, unknown]> = [
    ["Mã lệnh sản xuất", data.production_order_id],
    ["Vị trí lọc", data.filter_position],
    [
      "Màng lọc",
      data.filterMembrane
        ? `${data.filterMembrane.filter_code ?? ""}${data.filterMembrane.filter_type ? ` — ${data.filterMembrane.filter_type}` : ""}`
        : null,
    ],
    ["Người tiệt trùng", data.sterilizedBy?.name ?? data.sterilizedBy?.username],
    ["Yêu cầu ngoại quan trước lọc", data.pre_filter_appearance_requirement],
    ["Kết quả ngoại quan trước lọc", data.pre_filter_appearance_result],
    ["Yêu cầu nguyên vẹn trước tiệt trùng", data.pre_sterilization_integrity_requirement],
    ["Kết quả nguyên vẹn trước tiệt trùng", data.pre_sterilization_integrity_result],
    ["Lượng nước tráng (lít)", data.rinse_water_volume_liters],
    ["Bắt đầu lọc", data.filtering_started_at ? formatDateTime(data.filtering_started_at) : null],
    ["Kết thúc lọc", data.filtering_finished_at ? formatDateTime(data.filtering_finished_at) : null],
    ["Người lọc", data.filteredBy?.name ?? data.filteredBy?.username],
    ["Dịch tồn bồn (lít)", data.tank_residual_volume_liters],
    ["Yêu cầu toàn vẹn sau lọc", data.post_filter_integrity_requirement],
    ["Kết quả toàn vẹn sau lọc", data.post_filter_integrity_result],
    ["Yêu cầu ngoại quan màng sau lọc", data.post_filter_membrane_appearance_requirement],
    ["Kết quả ngoại quan màng sau lọc", data.post_filter_membrane_appearance_result],
    [
      "Người kiểm tra sau lọc",
      data.inspectedAfterFilterBy?.name ?? data.inspectedAfterFilterBy?.username,
    ],
  ];
  const detailFields = detailFieldEntries.flatMap(([label, value]) =>
    value === null || value === undefined || value === ""
      ? []
      : [{ label, value: String(value) }],
  );

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <DetailPanelHeader
        title={`Chi tiết kiểm tra quá trình lọc #${data.id}`}
        subtitle={formatDateTime(data.filtering_started_at)}
        actions={
          <>
            <Button size="sm" type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="bg-gray-900 text-white hover:bg-black"
            >
              <Trash2 className="size-4" />
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </>
        }
        onClose={onClose}
      />
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-3xl">
          <DialogHeader><DialogTitle>Cập nhật kiểm tra quá trình lọc</DialogTitle></DialogHeader>
          <FiltrationCheckForm
            productionOrderId={data.production_order_id ?? ""}
            data={data}
            onClose={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
      <div className="mt-4 min-h-10 rounded border border-dashed border-gray-200 p-2">
        <div className="flex flex-wrap gap-2">
        <div className="inline-flex flex-col items-center p-0.5 md:p-1">
          <button
            type="button"
            title="Kiểm tra trong quá trình lọc"
            disabled={isLoadingCurrentUser}
            onClick={() => setIsProcessCheckOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-center text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
          >
            <ClipboardCheck />
          </button>
          <div className="w-[90px]">
            <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
              Kiểm tra trong quá trình lọc
            </p>
          </div>
        </div>
        <div className="inline-flex flex-col items-center p-0.5 md:p-1">
          <button
            type="button"
            title="Kiểm tra sau lọc"
            disabled={isLoadingCurrentUser}
            onClick={() => {
              setPostFilterAppearanceResult(
                data?.post_filter_membrane_appearance_result ?? "",
              );
              setIsPostFilterCheckOpen(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-violet-500 px-3 py-2 text-center text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
          >
            <ClipboardCheck />
          </button>
          <div className="w-[90px]">
            <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">Kiểm tra sau lọc</p>
          </div>
        </div>
        <div className="inline-flex flex-col items-center p-0.5 md:p-1">
          <button
            type="button"
            title="Bắt đầu lọc"
            disabled={updatingFilteringTime !== null}
            onClick={() =>
              setFilteringTimeAction({
                field: "filtering_started_at",
                label: "Bắt đầu lọc",
              })
            }
            className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-emerald-500 px-3 py-2 text-center text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
          >
            <Play />
          </button>
          <div className="w-[90px]">
            <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">Bắt đầu lọc</p>
          </div>
        </div>
        <div className="inline-flex flex-col items-center p-0.5 md:p-1">
          <button
            type="button"
            title="Kết thúc lọc"
            disabled={updatingFilteringTime !== null}
            onClick={() =>
              setFilteringTimeAction({
                field: "filtering_finished_at",
                label: "Kết thúc lọc",
              })
            }
            className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-rose-500 px-3 py-2 text-center text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
          >
            <Square />
          </button>
          <div className="w-[90px]">
            <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">Kết thúc lọc</p>
          </div>
        </div>
        </div>
      </div>
      <Dialog open={isProcessCheckOpen} onOpenChange={setIsProcessCheckOpen}>
        <DialogContent className="md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Kiểm tra trong quá trình lọc</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleProcessCheckSubmit}>
            <div className="space-y-2">
              <Label htmlFor="rinse_water_volume_liters">Lượng nước tráng (lít)</Label>
              <Input
                id="rinse_water_volume_liters"
                name="rinse_water_volume_liters"
                type="number"
                min="0"
                step="0.001"
                defaultValue={data.rinse_water_volume_liters ?? ""}
                disabled={isSavingProcessCheck}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtering_started_at">Thời điểm bắt đầu</Label>
              <Input
                id="filtering_started_at"
                name="filtering_started_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(data.filtering_started_at)}
                disabled={isSavingProcessCheck}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filtering_finished_at">Thời điểm kết thúc</Label>
              <Input
                id="filtering_finished_at"
                name="filtering_finished_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(data.filtering_finished_at)}
                disabled={isSavingProcessCheck}
              />
            </div>
            <div className="space-y-2">
              <Label>Người lọc</Label>
              <Input
                value={currentUser?.id ? `Người dùng #${currentUser.id}` : ""}
                readOnly
                disabled
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProcessCheckOpen(false)} disabled={isSavingProcessCheck}>Hủy</Button>
              <Button type="submit" disabled={isSavingProcessCheck || isLoadingCurrentUser}>{isSavingProcessCheck ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isPostFilterCheckOpen} onOpenChange={setIsPostFilterCheckOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Kiểm tra sau lọc</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePostFilterCheckSubmit}>
            <div className="space-y-2">
              <Label htmlFor="tank_residual_volume_liters">Dịch tồn bồn (lít)</Label>
              <Input id="tank_residual_volume_liters" name="tank_residual_volume_liters" type="number" min="0" step="0.001" defaultValue={data.tank_residual_volume_liters ?? ""} disabled={isSavingPostFilterCheck} />
            </div>
            {hasPostFilterIntegrityRequirement ? <>
            <div className="space-y-2">
              <Label htmlFor="post_filter_integrity_requirement">Yêu cầu toàn vẹn sau lọc</Label>
              <Input id="post_filter_integrity_requirement" name="post_filter_integrity_requirement" value={postFilterIntegrityRequirement} readOnly disabled={isSavingPostFilterCheck} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post_filter_integrity_result">Kết quả toàn vẹn sau lọc</Label>
              <Input id="post_filter_integrity_result" name="post_filter_integrity_result" defaultValue={data.post_filter_integrity_result ?? ""} disabled={isSavingPostFilterCheck} />
            </div>
            </> : null}
            {hasPostFilterMembraneAppearanceRequirement ? <>
            <div className="space-y-2">
              <Label htmlFor="post_filter_membrane_appearance_requirement">Yêu cầu ngoại quan màng sau lọc</Label>
              <Input id="post_filter_membrane_appearance_requirement" name="post_filter_membrane_appearance_requirement" value={postFilterMembraneAppearanceRequirement} readOnly disabled={isSavingPostFilterCheck} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post_filter_membrane_appearance_result">Kết quả ngoại quan màng sau lọc</Label>
              <input
                type="hidden"
                id="post_filter_membrane_appearance_result"
                name="post_filter_membrane_appearance_result"
                value={postFilterAppearanceResult}
              />
              <div className="grid grid-cols-2 gap-2">
                {["Đạt", "Không đạt"].map((result) => (
                  <Button
                    key={result}
                    type="button"
                    variant={
                      postFilterAppearanceResult === result
                        ? "default"
                        : "outline"
                    }
                    disabled={isSavingPostFilterCheck}
                    onClick={() => setPostFilterAppearanceResult(result)}
                  >
                    {result}
                  </Button>
                ))}
              </div>
            </div>
            </> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPostFilterCheckOpen(false)} disabled={isSavingPostFilterCheck}>Hủy</Button>
              <Button type="submit" disabled={isSavingPostFilterCheck || isLoadingCurrentUser}>{isSavingPostFilterCheck ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(filteringTimeAction)}
        onOpenChange={(open) => !open && setFilteringTimeAction(null)}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận {filteringTimeAction?.label.toLocaleLowerCase("vi-VN")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Thời điểm hiện tại sẽ được lưu cho thao tác này.
            </p>
            <div className="rounded border bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
              {formatDateTime(new Date().toISOString())}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updatingFilteringTime !== null}
                onClick={() => setFilteringTimeAction(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={!filteringTimeAction || updatingFilteringTime !== null}
                onClick={() => {
                  if (filteringTimeAction) {
                    void handleSetFilteringTime(
                      filteringTimeAction.field,
                      filteringTimeAction.label,
                    );
                  }
                }}
              >
                {updatingFilteringTime ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mt-4 flex flex-col gap-4">
        {detailFields.map((field) => (
          <FieldDisplay key={field.label} lable={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}
