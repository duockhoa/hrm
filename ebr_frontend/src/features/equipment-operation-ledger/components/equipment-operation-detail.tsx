"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import { equipmentService } from "@/services/index.service";
import { TriangleAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  Equipment,
  EquipmentIncidentPriority,
  EquipmentIncidentReport,
  EquipmentMonitoringRecord,
  EquipmentParameter,
} from "@/features/equipment/types";

type IncidentFormState = {
  title: string;
  description: string;
  priority: EquipmentIncidentPriority;
};

const emptyIncidentForm: IncidentFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
};

const incidentPriorityLabels: Record<EquipmentIncidentPriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

const incidentStatusLabels: Record<EquipmentIncidentReport["status"], string> =
  {
    OPEN: "Mới báo cáo",
    IN_PROGRESS: "Đang xử lý",
    RESOLVED: "Đã khắc phục",
    CLOSED: "Đã đóng",
  };

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("vi-VN");
};

const dataTypeLabel: Record<EquipmentParameter["data_type"], string> = {
  text: "Chuỗi",
  number: "Số",
  boolean: "Đúng/sai",
  date: "Ngày",
  datetime: "Ngày giờ",
  select: "Lựa chọn",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 md:grid-cols-[160px_minmax(0,1fr)] md:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-gray-900">
        {value || "-"}
      </dd>
    </div>
  );
}

function EquipmentOperationDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    </div>
  );
}

const getProductionOrderLabel = (record: EquipmentMonitoringRecord) => {
  const order = record.productionOrder;

  if (!order) {
    return `Lệnh sản xuất #${record.production_order_id}`;
  }

  return [
    order.production_order_code || `Lệnh sản xuất #${order.id}`,
    order.lot_no,
  ]
    .filter(Boolean)
    .join(" - ");
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const responseMessage = (
    error as { response?: { data?: { message?: unknown } } }
  ).response?.data?.message;
  const errorMessage = (error as { message?: unknown }).message;

  return typeof responseMessage === "string"
    ? responseMessage
    : typeof errorMessage === "string"
      ? errorMessage
      : fallback;
};

function IncidentPriorityBadge({
  priority,
}: {
  priority: EquipmentIncidentPriority;
}) {
  const className = {
    LOW: "border-slate-200 bg-slate-50 text-slate-700",
    MEDIUM: "border-blue-200 bg-blue-50 text-blue-700",
    HIGH: "border-amber-200 bg-amber-50 text-amber-700",
    CRITICAL: "border-red-200 bg-red-50 text-red-700",
  }[priority];

  return (
    <Badge className={className}>{incidentPriorityLabels[priority]}</Badge>
  );
}

export default function EquipmentOperationDetail({
  equipment,
}: {
  equipment?: Equipment;
}) {
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [incidentForm, setIncidentForm] =
    useState<IncidentFormState>(emptyIncidentForm);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const {
    data: parameters,
    error: parametersError,
    isLoading: isParametersLoading,
  } = useSWR(
    equipment ? API_ROUTES.equipment.parameters(equipment.id) : null,
    () => equipmentService.fetchEquipmentParameters(equipment?.id ?? 0),
  );
  const {
    data: monitoringRecords,
    error: monitoringRecordsError,
    isLoading: isMonitoringRecordsLoading,
  } = useSWR(
    equipment
      ? `${API_ROUTES.equipment.monitoringRecords}?equipment_id=${equipment.id}`
      : null,
    () =>
      equipmentService.fetchEquipmentMonitoringRecords({
        equipment_id: equipment?.id ?? 0,
      }),
  );
  const {
    data: incidentReports,
    error: incidentReportsError,
    isLoading: isIncidentReportsLoading,
    mutate: mutateIncidentReports,
  } = useSWR(
    equipment
      ? `${API_ROUTES.equipment.incidentReports}?equipment_id=${equipment.id}`
      : null,
    () =>
      equipmentService.fetchEquipmentIncidentReports({
        equipment_id: equipment?.id ?? 0,
      }),
  );

  const handleIncidentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = incidentForm.title.trim();
    const description = incidentForm.description.trim();

    if (!title) {
      toast.error("Vui lòng nhập tiêu đề sự cố.");
      return;
    }

    if (!description) {
      toast.error("Vui lòng nhập mô tả sự cố.");
      return;
    }

    if (!equipment) {
      return;
    }

    setIsSubmittingIncident(true);
    try {
      await equipmentService.createEquipmentIncidentReport({
        equipment_id: equipment.id,
        title,
        description,
        priority: incidentForm.priority,
      });
      toast.success("Đã gửi báo cáo sự cố.");
      setIncidentForm(emptyIncidentForm);
      setIsIncidentDialogOpen(false);
      await mutateIncidentReports();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể gửi báo cáo sự cố."));
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  if (!equipment) {
    return <EquipmentOperationDetailSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-mono text-xs text-gray-500">
              {equipment.code}
            </div>
            <h1 className="mt-1 text-xl font-semibold">{equipment.name}</h1>
          </div>
          <Button
            type="button"
            className="shrink-0"
            onClick={() => setIsIncidentDialogOpen(true)}
          >
            <TriangleAlert className="size-4" />
            Báo cáo sự cố
          </Button>
        </div>

        <dl className="mt-2">
          <DetailRow label="Mã thiết bị" value={equipment.code} />
          <DetailRow label="Tên thiết bị" value={equipment.name} />
        </dl>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-base font-semibold">Thông số theo dõi</h2>
        {parametersError ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Không thể tải thông số thiết bị.
          </p>
        ) : isParametersLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (parameters ?? []).length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Tên thông số</th>
                  <th className="px-3 py-2 font-medium">Kiểu dữ liệu</th>
                  <th className="px-3 py-2 font-medium">Đơn vị</th>
                  <th className="px-3 py-2 font-medium">Bắt buộc</th>
                </tr>
              </thead>
              <tbody>
                {[...(parameters ?? [])]
                  .sort((first, second) =>
                    first.name.localeCompare(second.name),
                  )
                  .map((parameter) => (
                    <tr key={parameter.id} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {parameter.name}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {dataTypeLabel[parameter.data_type]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{parameter.unit || "-"}</td>
                      <td className="px-3 py-2">
                        {parameter.is_required ? "Có" : "Không"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Thiết bị chưa có thông số theo dõi.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-red-600" />
          <h2 className="text-base font-semibold">Báo cáo sự cố</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Các sự cố đã được ghi nhận cho thiết bị này.
        </p>

        {incidentReportsError ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Không thể tải báo cáo sự cố.
          </p>
        ) : isIncidentReportsLoading ? (
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : (incidentReports ?? []).length > 0 ? (
          <div className="mt-3 space-y-3">
            {(incidentReports ?? []).map((report) => (
              <article key={report.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-gray-900">
                      {report.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <IncidentPriorityBadge priority={report.priority} />
                      <Badge variant="outline">
                        {incidentStatusLabels[report.status]}
                      </Badge>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(report.created_at)}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                  {report.description}
                </p>
                {report.createdBy?.name || report.createdBy?.username ? (
                  <p className="mt-3 text-xs text-gray-500">
                    Người báo cáo:{" "}
                    {report.createdBy.name || report.createdBy.username}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Chưa có báo cáo sự cố cho thiết bị này.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-base font-semibold">Lịch sử vận hành</h2>
        <p className="mt-1 text-sm text-gray-500">
          Các lần ghi nhận thông số từ lệnh sản xuất.
        </p>

        {monitoringRecordsError ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Không thể tải lịch sử vận hành.
          </p>
        ) : isMonitoringRecordsLoading ? (
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : (monitoringRecords ?? []).length > 0 ? (
          <div className="mt-3 space-y-3">
            {(monitoringRecords ?? []).map((record) => (
              <article key={record.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {getProductionOrderLabel(record)}
                    </p>
                    {record.productionOrder?.item?.item_name ? (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {record.productionOrder.item.item_name}
                      </p>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(record.recorded_at || record.created_at)}
                  </time>
                </div>

                {record.values?.length ? (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {record.values.map((value) => (
                      <div
                        key={value.id}
                        className="rounded bg-gray-50 px-2.5 py-2 text-sm"
                      >
                        <dt className="text-xs text-gray-500">
                          {value.parameter?.name || "Thông số"}
                        </dt>
                        <dd className="mt-0.5 font-medium text-gray-900">
                          {value.value}
                          {value.parameter?.unit
                            ? ` ${value.parameter.unit}`
                            : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {record.note ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                    {record.note}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Chưa có dữ liệu vận hành cho thiết bị này.
          </p>
        )}
      </section>

      <Dialog
        open={isIncidentDialogOpen}
        onOpenChange={(open) => {
          setIsIncidentDialogOpen(open);
          if (!open && !isSubmittingIncident) {
            setIncidentForm(emptyIncidentForm);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo sự cố thiết bị</DialogTitle>
            <DialogDescription>
              {equipment.code} - {equipment.name}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleIncidentSubmit}>
            <div className="space-y-2">
              <Label htmlFor="incident-title">Tiêu đề sự cố</Label>
              <Input
                id="incident-title"
                value={incidentForm.title}
                placeholder="Ví dụ: Máy không khởi động được"
                maxLength={255}
                disabled={isSubmittingIncident}
                onChange={(event) =>
                  setIncidentForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident-description">Mô tả sự cố</Label>
              <Textarea
                id="incident-description"
                value={incidentForm.description}
                placeholder="Mô tả hiện tượng, thời điểm xảy ra và ảnh hưởng của sự cố."
                disabled={isSubmittingIncident}
                onChange={(event) =>
                  setIncidentForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Mức độ ưu tiên</Label>
              <Select
                value={incidentForm.priority}
                disabled={isSubmittingIncident}
                onValueChange={(priority) =>
                  setIncidentForm((current) => ({
                    ...current,
                    priority: priority as EquipmentIncidentPriority,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn mức độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      incidentPriorityLabels,
                    ) as EquipmentIncidentPriority[]
                  ).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {incidentPriorityLabels[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingIncident}
                onClick={() => setIsIncidentDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmittingIncident}>
                {isSubmittingIncident ? "Đang gửi..." : "Gửi báo cáo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
