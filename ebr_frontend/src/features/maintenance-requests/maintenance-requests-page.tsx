"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import { AiOutlineRight } from "react-icons/ai";
import { Edit2, Plus, QrCode, Trash2 } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { QrScanDialog } from "@/components/qr-scan-dialog/qr-scan-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  maintenanceEquipmentKey,
  maintenanceRequestsKey,
  maintenanceRequestsService as service,
  type MaintenanceRequest,
  type MaintenanceRequestInput,
  type Priority,
} from "@/services/maintenance-requests.service";

const priorities: Record<Priority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};
const priorityColors: Record<Priority, string> = {
  LOW: "text-gray-600",
  MEDIUM: "text-blue-600",
  HIGH: "text-amber-600",
  URGENT: "text-red-600",
};
const emptyForm: MaintenanceRequestInput = {
  equipmentCode: "",
  title: "",
  description: "",
  priority: "MEDIUM",
};

function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error
    ? error.message
    : "Thao tác không thành công. Vui lòng thử lại.";
}

export default function MaintenanceRequestsPage() {
  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(maintenanceRequestsKey, service.list);
  const {
    data: equipment = [],
    error: equipmentError,
    isLoading: isEquipmentLoading,
  } = useSWR(maintenanceEquipmentKey, service.listEquipment);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState<MaintenanceRequestInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isEquipmentScannerOpen, setIsEquipmentScannerOpen] = useState(false);
  const groups = new Map<string, MaintenanceRequest[]>();
  for (const record of records ?? []) {
    const date = new Date(record.createdAt).toLocaleDateString("vi-VN");
    groups.set(date, [...(groups.get(date) ?? []), record]);
  }

  function openForm(record: MaintenanceRequest | null) {
    setEditing(record);
    setForm(
      record
        ? {
            equipmentCode: record.equipment?.code ?? "",
            title: record.title,
            description: record.description,
            priority: record.priority,
          }
        : { ...emptyForm },
    );
    setOpen(true);
  }

  function handleEquipmentQrScan(decodedText: string) {
    const equipmentCode = decodedText.split("$", 1)[0]?.trim();

    if (!equipmentCode) {
      toast.error("Không đọc được mã thiết bị từ QR.");
      return;
    }

    const matchedEquipment = equipment.find(
      (item) => item.code.trim().toLowerCase() === equipmentCode.toLowerCase(),
    );

    if (!matchedEquipment) {
      toast.error(`Không tìm thấy thiết bị có mã ${equipmentCode}.`);
      return;
    }

    setForm({ ...form, equipmentCode: matchedEquipment.code });
    toast.success(`Đã chọn thiết bị ${matchedEquipment.code}.`);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const input = {
      ...form,
      equipmentCode: form.equipmentCode.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
    };
    if (!input.equipmentCode || !input.title || !input.description) {
      toast.error("Vui lòng nhập đầy đủ mã thiết bị, tiêu đề và mô tả.");
      return;
    }
    setSaving(true);
    try {
      if (editing) await service.update(editing, input);
      else await service.create(input);
      toast.success(
        editing ? "Đã cập nhật báo cáo sự cố." : "Đã thêm báo cáo sự cố.",
      );
      setOpen(false);
      await mutate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting || removing) return;
    setRemoving(true);
    try {
      await service.remove(deleting.id);
      toast.success("Đã xóa báo cáo sự cố.");
      setDeleting(null);
      await mutate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href="/maintenance-requests">Báo cáo sự cố</Link>
          </div>
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="size-4" />
            Thêm
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <p role="alert" className="p-4 text-sm text-red-600">
            Không thể tải báo cáo sự cố. {errorMessage(error)}
          </p>
        ) : isLoading ? (
          Array.from({ length: 10 }, (_, index) => (
            <div
              key={index}
              className="flex min-h-[100px] items-center gap-4 border-b border-gray-200 px-3 py-4"
            >
              <div className="flex-1">
                <Skeleton className="mb-2 h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))
        ) : groups.size ? (
          Array.from(groups, ([date, items]) => (
            <Fragment key={date}>
              <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                {date}
              </div>
              {items.map((record) => {
                const locked =
                  record.status === "CLOSED" ||
                  Boolean(record.workOrders?.length);
                return (
                  <div
                    key={record.id}
                    className="flex min-h-[100px] items-center gap-4 border-b border-gray-200 px-3 py-4 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-bold text-gray-900"
                        title={record.title}
                      >
                        {record.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-gray-600">
                        {record.equipment?.code} · {record.requestCode}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                        {record.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-xs font-semibold ${priorityColors[record.priority] ?? "text-gray-600"}`}
                      >
                        {priorities[record.priority] ?? record.priority}
                      </p>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Sửa ${record.requestCode}`}
                          title={
                            locked
                              ? "Báo cáo đã đóng hoặc đã có lệnh công việc nên không thể sửa"
                              : "Sửa"
                          }
                          disabled={locked}
                          onClick={() => openForm(record)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Xóa ${record.requestCode}`}
                          title="Xóa"
                          onClick={() => setDeleting(record)}
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            Chưa có báo cáo sự cố.
          </p>
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) {
            setOpen(value);
            if (!value) setIsEquipmentScannerOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa báo cáo sự cố" : "Thêm báo cáo sự cố"}
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin thiết bị và sự cố.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={saving} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="incident-equipment">Mã thiết bị</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={form.equipmentCode}
                    disabled={
                      saving || isEquipmentLoading || Boolean(equipmentError)
                    }
                    onValueChange={(equipmentCode) =>
                      setForm({ ...form, equipmentCode })
                    }
                  >
                    <SelectTrigger
                      id="incident-equipment"
                      className="min-w-0 flex-1"
                    >
                      <SelectValue
                        placeholder={
                          isEquipmentLoading
                            ? "Đang tải danh sách thiết bị..."
                            : "Chọn thiết bị"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((item) => (
                        <SelectItem key={item.id} value={item.code}>
                          {item.code} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={
                      saving || isEquipmentLoading || Boolean(equipmentError)
                    }
                    onClick={() => setIsEquipmentScannerOpen(true)}
                    aria-label="Quét QR thiết bị"
                    title="Quét QR thiết bị"
                  >
                    <QrCode className="size-4" />
                  </Button>
                </div>
                {equipmentError ? (
                  <p className="text-sm text-red-600">
                    Không thể tải danh sách thiết bị.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-title">Tiêu đề sự cố</Label>
                <Input
                  id="incident-title"
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-description">Mô tả</Label>
                <Textarea
                  id="incident-description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-priority">Mức độ ưu tiên</Label>
                <Select
                  value={form.priority}
                  disabled={saving}
                  onValueChange={(priority: Priority) =>
                    setForm({ ...form, priority })
                  }
                >
                  <SelectTrigger id="incident-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorities).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <QrScanDialog
        open={isEquipmentScannerOpen}
        title="Quét QR thiết bị"
        description="Quét mã QR để chọn thiết bị trong danh sách. Nội dung sau ký tự $ sẽ được bỏ qua."
        onOpenChange={setIsEquipmentScannerOpen}
        onScan={handleEquipmentQrScan}
      />
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value && !removing) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa báo cáo sự cố</DialogTitle>
            <DialogDescription>
              Xóa vĩnh viễn báo cáo {deleting?.requestCode} và dữ liệu xử lý
              liên quan. Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded border bg-gray-50 p-3 text-sm">
            {deleting?.title}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={removing}
              onClick={() => setDeleting(null)}
            >
              Hủy
            </Button>
            <Button variant="destructive" disabled={removing} onClick={remove}>
              {removing ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
