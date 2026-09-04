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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { equipmentService } from "@/services/index.service";
import {
  Edit2,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  CreateEquipmentParameterPayload,
  CreateEquipmentPayload,
  Equipment,
  EquipmentParameter,
  EquipmentParameterDataType,
  UpdateEquipmentParameterPayload,
  UpdateEquipmentPayload,
} from "../types";

type EquipmentFormState = {
  code: string;
  name: string;
};

type ParameterFormState = {
  name: string;
  data_type: EquipmentParameterDataType;
  unit: string;
  is_required: boolean;
};

const emptyEquipmentForm: EquipmentFormState = {
  code: "",
  name: "",
};

const emptyParameterForm: ParameterFormState = {
  name: "",
  data_type: "text",
  unit: "",
  is_required: true,
};

const DATA_TYPE_OPTIONS: Array<{
  value: EquipmentParameterDataType;
  label: string;
}> = [
  { value: "text", label: "Chuỗi" },
  { value: "number", label: "Số" },
  { value: "boolean", label: "Đúng/sai" },
  { value: "date", label: "Ngày" },
  { value: "datetime", label: "Ngày giờ" },
  { value: "select", label: "Lựa chọn" },
];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const formatDateTime = (value?: string) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN");
};

const getDataTypeLabel = (dataType: EquipmentParameterDataType) =>
  DATA_TYPE_OPTIONS.find((option) => option.value === dataType)?.label ??
  dataType;

const buildCreateEquipmentPayload = (
  form: EquipmentFormState,
): CreateEquipmentPayload => ({
  code: form.code.trim(),
  name: form.name.trim(),
});

const buildUpdateEquipmentPayload = (
  form: EquipmentFormState,
  equipment: Equipment,
): UpdateEquipmentPayload => {
  const payload: UpdateEquipmentPayload = {};
  const code = form.code.trim();
  const name = form.name.trim();

  if (code !== equipment.code) {
    payload.code = code;
  }

  if (name !== equipment.name) {
    payload.name = name;
  }

  return payload;
};

const buildCreateParameterPayload = (
  form: ParameterFormState,
): CreateEquipmentParameterPayload => {
  const unit = form.unit.trim();

  return {
    name: form.name.trim(),
    data_type: form.data_type,
    unit: unit ? unit : null,
    is_required: form.is_required,
  };
};

const buildUpdateParameterPayload = (
  form: ParameterFormState,
  parameter: EquipmentParameter,
): UpdateEquipmentParameterPayload => {
  const payload: UpdateEquipmentParameterPayload = {};
  const name = form.name.trim();
  const unit = form.unit.trim();
  const normalizedUnit = unit ? unit : null;

  if (name !== parameter.name) {
    payload.name = name;
  }

  if (form.data_type !== parameter.data_type) {
    payload.data_type = form.data_type;
  }

  if (normalizedUnit !== parameter.unit) {
    payload.unit = normalizedUnit;
  }

  if (form.is_required !== parameter.is_required) {
    payload.is_required = form.is_required;
  }

  return payload;
};

function DataTypeBadge({
  dataType,
}: {
  dataType: EquipmentParameterDataType;
}) {
  return <Badge variant="outline">{getDataTypeLabel(dataType)}</Badge>;
}

export default function EquipmentPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(
    null,
  );
  const [isEquipmentFormOpen, setIsEquipmentFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null,
  );
  const [deletingEquipment, setDeletingEquipment] =
    useState<Equipment | null>(null);
  const [equipmentForm, setEquipmentForm] =
    useState<EquipmentFormState>(emptyEquipmentForm);
  const [isParameterFormOpen, setIsParameterFormOpen] = useState(false);
  const [editingParameter, setEditingParameter] =
    useState<EquipmentParameter | null>(null);
  const [deletingParameter, setDeletingParameter] =
    useState<EquipmentParameter | null>(null);
  const [parameterForm, setParameterForm] =
    useState<ParameterFormState>(emptyParameterForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: equipment,
    error: equipmentError,
    isLoading: isEquipmentLoading,
    mutate: mutateEquipment,
  } = useSWR("/equipment", equipmentService.fetchEquipment);

  const effectiveSelectedEquipmentId =
    selectedEquipmentId !== null &&
    (equipment ?? []).some((item) => item.id === selectedEquipmentId)
      ? selectedEquipmentId
      : (equipment?.[0]?.id ?? null);

  const selectedEquipment = useMemo(
    () =>
      (equipment ?? []).find(
        (item) => item.id === effectiveSelectedEquipmentId,
      ) ?? null,
    [equipment, effectiveSelectedEquipmentId],
  );

  const parametersKey = selectedEquipment
    ? `/equipment/${selectedEquipment.id}/parameters`
    : null;

  const {
    data: parameters,
    error: parametersError,
    isLoading: isParametersLoading,
    mutate: mutateParameters,
  } = useSWR(parametersKey, () =>
    equipmentService.fetchEquipmentParameters(selectedEquipment?.id ?? 0),
  );

  const filteredEquipment = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (equipment ?? [])
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.code, item.name, item.createdBy?.name, item.createdBy?.username]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedKeyword),
          );
      })
      .sort((first, second) => first.code.localeCompare(second.code));
  }, [equipment, keyword]);

  const openCreateEquipmentForm = () => {
    setEditingEquipment(null);
    setEquipmentForm(emptyEquipmentForm);
    setIsEquipmentFormOpen(true);
  };

  const openEditEquipmentForm = (item: Equipment) => {
    setEditingEquipment(item);
    setEquipmentForm({
      code: item.code,
      name: item.name,
    });
    setIsEquipmentFormOpen(true);
  };

  const openCreateParameterForm = () => {
    setEditingParameter(null);
    setParameterForm(emptyParameterForm);
    setIsParameterFormOpen(true);
  };

  const openEditParameterForm = (parameter: EquipmentParameter) => {
    setEditingParameter(parameter);
    setParameterForm({
      name: parameter.name,
      data_type: parameter.data_type,
      unit: parameter.unit ?? "",
      is_required: parameter.is_required,
    });
    setIsParameterFormOpen(true);
  };

  const validateEquipmentForm = () => {
    const code = equipmentForm.code.trim();
    const name = equipmentForm.name.trim();

    if (!code) {
      toast.error("Vui lòng nhập mã thiết bị.");
      return false;
    }

    if (code.length > 100) {
      toast.error("Mã thiết bị tối đa 100 ký tự.");
      return false;
    }

    if (!name) {
      toast.error("Vui lòng nhập tên thiết bị.");
      return false;
    }

    if (name.length > 255) {
      toast.error("Tên thiết bị tối đa 255 ký tự.");
      return false;
    }

    return true;
  };

  const validateParameterForm = () => {
    const name = parameterForm.name.trim();
    const unit = parameterForm.unit.trim();

    if (!name) {
      toast.error("Vui lòng nhập tên thông số.");
      return false;
    }

    if (name.length > 255) {
      toast.error("Tên thông số tối đa 255 ký tự.");
      return false;
    }

    if (unit.length > 50) {
      toast.error("Đơn vị tối đa 50 ký tự.");
      return false;
    }

    return true;
  };

  const handleEquipmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateEquipmentForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEquipment) {
        const payload = buildUpdateEquipmentPayload(
          equipmentForm,
          editingEquipment,
        );

        if (Object.keys(payload).length === 0) {
          toast.info("Không có thay đổi để lưu.");
          setIsSubmitting(false);
          return;
        }

        await equipmentService.updateEquipment(editingEquipment.id, payload);
        toast.success("Đã cập nhật thiết bị.");
      } else {
        const created = await equipmentService.createEquipment(
          buildCreateEquipmentPayload(equipmentForm),
        );
        setSelectedEquipmentId(created.id);
        toast.success("Đã tạo thiết bị.");
      }

      setIsEquipmentFormOpen(false);
      await mutateEquipment();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu thiết bị."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!deletingEquipment) {
      return;
    }

    setIsSubmitting(true);
    try {
      await equipmentService.deleteEquipment(deletingEquipment.id);
      toast.success("Đã xóa thiết bị.");

      if (effectiveSelectedEquipmentId === deletingEquipment.id) {
        setSelectedEquipmentId(null);
      }

      setDeletingEquipment(null);
      await mutateEquipment();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa thiết bị."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParameterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedEquipment || !validateParameterForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingParameter) {
        const payload = buildUpdateParameterPayload(
          parameterForm,
          editingParameter,
        );

        if (Object.keys(payload).length === 0) {
          toast.info("Không có thay đổi để lưu.");
          setIsSubmitting(false);
          return;
        }

        await equipmentService.updateEquipmentParameter(
          editingParameter.id,
          payload,
        );
        toast.success("Đã cập nhật thông số.");
      } else {
        await equipmentService.createEquipmentParameter(
          selectedEquipment.id,
          buildCreateParameterPayload(parameterForm),
        );
        toast.success("Đã tạo thông số.");
      }

      setIsParameterFormOpen(false);
      await mutateParameters();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu thông số thiết bị."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParameter = async () => {
    if (!deletingParameter) {
      return;
    }

    setIsSubmitting(true);
    try {
      await equipmentService.deleteEquipmentParameter(deletingParameter.id);
      toast.success("Đã xóa thông số.");
      setDeletingParameter(null);
      await mutateParameters();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa thông số thiết bị."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Thiết bị</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách thiết bị và các thông số cần nhập theo từng thiết bị.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                mutateEquipment();
                mutateParameters();
              }}
              disabled={isEquipmentLoading}
              title="Tải lại"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button onClick={openCreateEquipmentForm}>
              <Plus className="size-4" />
              Thêm thiết bị
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo mã, tên thiết bị hoặc người tạo"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <section className="min-h-0 overflow-auto rounded-md border">
          {equipmentError ? (
            <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Không thể tải danh sách thiết bị.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead className="w-36">Mã</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead className="w-36">Người tạo</TableHead>
                  <TableHead className="w-40">Cập nhật</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isEquipmentLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <div className="h-8 animate-pulse rounded bg-gray-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredEquipment.length > 0 ? (
                  filteredEquipment.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "cursor-pointer",
                        effectiveSelectedEquipmentId === item.id && "bg-blue-50",
                      )}
                      onClick={() => setSelectedEquipmentId(item.id)}
                    >
                      <TableCell className="text-gray-500">{item.id}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {item.createdBy?.name ??
                          item.createdBy?.username ??
                          item.created_by_id ??
                          ""}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(item.updated_at)}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditEquipmentForm(item)}
                            title="Sửa"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingEquipment(item)}
                            title="Xóa"
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-sm text-gray-500"
                    >
                      Chưa có thiết bị phù hợp.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border">
          <div className="flex items-center justify-between gap-3 border-b p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-blue-600" />
                <h2 className="truncate text-base font-semibold">
                  Thông số thiết bị
                </h2>
              </div>
              <p className="mt-1 truncate text-sm text-gray-500">
                {selectedEquipment
                  ? `${selectedEquipment.code} - ${selectedEquipment.name}`
                  : "Chọn một thiết bị để quản lý thông số."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={openCreateParameterForm}
              disabled={!selectedEquipment}
            >
              <Plus className="size-4" />
              Thêm thông số
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            {!selectedEquipment ? (
              <div className="flex h-full min-h-60 items-center justify-center rounded-md border border-dashed text-center text-sm text-gray-500">
                Chưa chọn thiết bị.
              </div>
            ) : parametersError ? (
              <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Không thể tải danh sách thông số thiết bị.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Tên thông số</TableHead>
                    <TableHead className="w-28">Kiểu</TableHead>
                    <TableHead className="w-24">Đơn vị</TableHead>
                    <TableHead className="w-28">Bắt buộc</TableHead>
                    <TableHead className="w-20 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isParametersLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={5}>
                          <div className="h-8 animate-pulse rounded bg-gray-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (parameters ?? []).length > 0 ? (
                    (parameters ?? [])
                      .slice()
                      .sort((first, second) =>
                        first.name.localeCompare(second.name),
                      )
                      .map((parameter) => (
                        <TableRow key={parameter.id}>
                          <TableCell className="font-medium">
                            {parameter.name}
                          </TableCell>
                          <TableCell>
                            <DataTypeBadge dataType={parameter.data_type} />
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {parameter.unit ?? ""}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                parameter.is_required ? "secondary" : "outline"
                              }
                            >
                              {parameter.is_required ? "Có" : "Không"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditParameterForm(parameter)}
                                title="Sửa"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeletingParameter(parameter)}
                                title="Xóa"
                              >
                                <Trash2 className="size-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-sm text-gray-500"
                      >
                        Thiết bị này chưa có thông số.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={isEquipmentFormOpen}
        onOpenChange={setIsEquipmentFormOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? "Cập nhật thiết bị" : "Thêm thiết bị"}
            </DialogTitle>
            <DialogDescription>
              Mã thiết bị và tên thiết bị là bắt buộc.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEquipmentSubmit}>
            <div className="space-y-2">
              <Label htmlFor="equipment-code">Mã thiết bị</Label>
              <Input
                id="equipment-code"
                value={equipmentForm.code}
                maxLength={100}
                disabled={isSubmitting}
                onChange={(event) =>
                  setEquipmentForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-name">Tên thiết bị</Label>
              <Input
                id="equipment-name"
                value={equipmentForm.name}
                maxLength={255}
                disabled={isSubmitting}
                onChange={(event) =>
                  setEquipmentForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEquipmentFormOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingEquipment)}
        onOpenChange={(open) => !open && setDeletingEquipment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thiết bị</DialogTitle>
            <DialogDescription>
              API sẽ trả về thiết bị vừa xóa sau khi thao tác thành công.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingEquipment?.name}</div>
            <div className="mt-1 font-mono text-xs text-gray-500">
              {deletingEquipment?.code}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingEquipment(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEquipment}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isParameterFormOpen}
        onOpenChange={setIsParameterFormOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingParameter ? "Cập nhật thông số" : "Thêm thông số"}
            </DialogTitle>
            <DialogDescription>
              Tên thông số không được trùng trong cùng một thiết bị.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleParameterSubmit}>
            <div className="space-y-2">
              <Label htmlFor="parameter-name">Tên thông số</Label>
              <Input
                id="parameter-name"
                value={parameterForm.name}
                maxLength={255}
                disabled={isSubmitting}
                onChange={(event) =>
                  setParameterForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Kiểu dữ liệu</Label>
              <Select
                value={parameterForm.data_type}
                disabled={isSubmitting}
                onValueChange={(value) =>
                  setParameterForm((current) => ({
                    ...current,
                    data_type: value as EquipmentParameterDataType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn kiểu dữ liệu" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parameter-unit">Đơn vị</Label>
              <Input
                id="parameter-unit"
                value={parameterForm.unit}
                maxLength={50}
                disabled={isSubmitting}
                onChange={(event) =>
                  setParameterForm((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="parameter-required">Bắt buộc nhập</Label>
                <p className="mt-1 text-xs text-gray-500">
                  Khi bật, thông số này là trường bắt buộc.
                </p>
              </div>
              <Switch
                id="parameter-required"
                checked={parameterForm.is_required}
                disabled={isSubmitting}
                onCheckedChange={(checked) =>
                  setParameterForm((current) => ({
                    ...current,
                    is_required: checked,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsParameterFormOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingParameter)}
        onOpenChange={(open) => !open && setDeletingParameter(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thông số</DialogTitle>
            <DialogDescription>
              API sẽ trả về thông số vừa xóa sau khi thao tác thành công.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingParameter?.name}</div>
            <div className="mt-1 text-sm text-gray-500">
              {deletingParameter
                ? getDataTypeLabel(deletingParameter.data_type)
                : ""}
              {deletingParameter?.unit ? ` - ${deletingParameter.unit}` : ""}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingParameter(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteParameter}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
