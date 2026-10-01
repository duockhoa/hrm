"use client";

import { useRef, useState, type FormEvent } from "react";
import { QrCode } from "lucide-react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  maintenanceRequestKey,
  maintenanceRequestsKey,
  maintenanceRequestsService as service,
  type MaintenanceRequest,
  type MaintenanceRequestInput,
  type Priority,
} from "@/services/maintenance-requests.service";

import { errorMessage, priorities } from "./utils";

const emptyForm: MaintenanceRequestInput = {
  equipmentCode: "",
  title: "",
  description: "",
  priority: "MEDIUM",
};

export default function MaintenanceRequestFormDialog({
  record: editing = null,
  onClose,
}: {
  record?: MaintenanceRequest | null;
  onClose: () => void;
}) {
  const {
    data: equipment = [],
    error: equipmentError,
    isLoading: isEquipmentLoading,
  } = useSWR(maintenanceEquipmentKey, service.listEquipment);
  const [form, setForm] = useState<MaintenanceRequestInput>(() =>
    editing
      ? {
          equipmentCode: editing.equipment?.code ?? "",
          title: editing.title,
          description: editing.description,
          priority: editing.priority,
        }
      : { ...emptyForm },
  );
  const [saving, setSaving] = useState(false);
  const [isEquipmentScannerOpen, setIsEquipmentScannerOpen] = useState(false);
  const equipmentDialogContentRef = useRef<HTMLDivElement | null>(null);
  const selectedEquipment = equipment.find(
    (item) => item.code === form.equipmentCode,
  );

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
      await Promise.all([
        mutate(maintenanceRequestsKey),
        ...(editing ? [mutate(maintenanceRequestKey(editing.id))] : []),
      ]);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(value) => {
          if (!saving && !value) onClose();
        }}
      >
        <DialogContent
          ref={equipmentDialogContentRef}
          className="max-h-[90dvh] overflow-y-auto"
        >
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
                  <Combobox
                    autoHighlight
                    items={equipment}
                    value={selectedEquipment ?? null}
                    disabled={
                      saving || isEquipmentLoading || Boolean(equipmentError)
                    }
                    onValueChange={(item) =>
                      setForm({ ...form, equipmentCode: item?.code ?? "" })
                    }
                    itemToStringLabel={(item) => `${item.code} - ${item.name}`}
                    isItemEqualToValue={(item, value) => item.code === value.code}
                  >
                    <ComboboxInput
                      id="incident-equipment"
                      className="min-w-0 flex-1"
                      placeholder={
                        isEquipmentLoading
                          ? "Đang tải danh sách thiết bị..."
                          : "Tìm và chọn thiết bị theo mã hoặc tên"
                      }
                      aria-label="Tìm thiết bị"
                      disabled={
                        saving || isEquipmentLoading || Boolean(equipmentError)
                      }
                      showClear
                    />
                    <ComboboxContent portalContainer={equipmentDialogContentRef}>
                      <ComboboxEmpty>Không tìm thấy thiết bị.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item.id} value={item}>
                            {item.code} - {item.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
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
                onClick={onClose}
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
    </>
  );
}
