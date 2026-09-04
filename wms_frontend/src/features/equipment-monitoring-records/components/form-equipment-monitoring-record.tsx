"use client";

import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import { equipmentService, itemsService } from "@/services/index.service";
import type {
  EquipmentMonitoringRecord,
  EquipmentParameter,
} from "@/features/equipment/types";
import type { ItemEquipment } from "@/features/item-equipment/types";
import { Camera, Eye, ImageUp, Loader2, Settings2, X } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import useSWR from "swr";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const MAX_MONITORING_IMAGES = 10;
const MAX_MONITORING_IMAGE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_MONITORING_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MONITORING_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function EquipmentMonitoringImagePicker({
  disabled,
  id,
  images,
  onChange,
}: {
  disabled: boolean;
  id: string;
  images: File[];
  onChange: (images: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addImages = (files: FileList | null) => {
    const selectedImages = Array.from(files ?? []);

    if (selectedImages.length === 0) {
      return;
    }

    const invalidType = selectedImages.find(
      (image) => !ACCEPTED_MONITORING_IMAGE_TYPES.includes(image.type),
    );
    if (invalidType) {
      toast.error("Ảnh phải có định dạng JPG, PNG, WEBP hoặc GIF.");
      return;
    }

    const oversizedImage = selectedImages.find(
      (image) => image.size > MAX_MONITORING_IMAGE_SIZE,
    );
    if (oversizedImage) {
      toast.error(`Ảnh ${oversizedImage.name} vượt quá dung lượng 20 MB.`);
      return;
    }

    const nextImages = [...images, ...selectedImages];
    if (nextImages.length > MAX_MONITORING_IMAGES) {
      toast.error("Tối đa 10 ảnh cho mỗi lần tải lên.");
      return;
    }

    onChange(nextImages);
  };

  return (
    <div className="space-y-2">
      <Label>Hình ảnh</Label>
      <Input
        ref={fileInputRef}
        id={`${id}-library`}
        type="file"
        accept={MONITORING_IMAGE_ACCEPT}
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraInputRef}
        id={`${id}-camera`}
        type="file"
        accept={MONITORING_IMAGE_ACCEPT}
        capture="environment"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || images.length >= MAX_MONITORING_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="size-4" />
          Chọn từ thư viện
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || images.length >= MAX_MONITORING_IMAGES}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" />
          Chụp ảnh
        </Button>
      </div>
      {images.length > 0 ? (
        <div className="space-y-2 rounded border bg-gray-50 p-2">
          {images.map((image, index) => (
            <div
              key={`${image.name}-${image.lastModified}-${index}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate text-gray-700">
                {image.name}
              </span>
              <button
                type="button"
                aria-label={`Bỏ ảnh ${image.name}`}
                disabled={disabled}
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-red-600 disabled:opacity-50"
                onClick={() =>
                  onChange(
                    images.filter((_, imageIndex) => imageIndex !== index),
                  )
                }
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-gray-500">
        Tối đa 10 ảnh; hỗ trợ JPG, PNG, WEBP, GIF; tối đa 20 MB/ảnh.
      </p>
    </div>
  );
}

function AuthenticatedEquipmentMonitoringImage({
  imagePath,
  label,
}: {
  imagePath: string;
  label: string;
}) {
  return (
    <AuthenticatedImage
      src={imagePath}
      alt={label}
      className="aspect-square w-full"
      height={320}
      width={320}
      loading="lazy"
      objectFit="contain"
    />
  );
}

const getUserLabel = (
  user:
    | {
        name?: string | null;
        username?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

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

const getEquipmentLabel = (record: EquipmentMonitoringRecord) =>
  record.equipment?.code
    ? `${record.equipment.code} - ${record.equipment.name}`
    : `Thiết bị #${record.equipment_id}`;

const getParameterSelectOptions = (parameter: EquipmentParameter) => {
  const parameterWithOptions = parameter as EquipmentParameter & {
    options?: string[] | string | null;
    select_options?: string[] | string | null;
  };
  const rawOptions =
    parameterWithOptions.options ?? parameterWithOptions.select_options;

  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option) => String(option).trim())
      .filter((option) => option.length > 0);
  }

  if (typeof rawOptions !== "string") {
    return [];
  }

  const trimmedOptions = rawOptions.trim();

  if (!trimmedOptions) {
    return [];
  }

  try {
    const parsedOptions = JSON.parse(trimmedOptions);

    if (Array.isArray(parsedOptions)) {
      return parsedOptions
        .map((option) => String(option).trim())
        .filter((option) => option.length > 0);
    }
  } catch {
    // Backend hiện chưa chuẩn hóa field options; fallback tách chuỗi bên dưới.
  }

  return trimmedOptions
    .split(/[\n,;]/)
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
};

const normalizeParameterValue = (
  parameter: EquipmentParameter,
  value: string,
) => {
  const trimmedValue = value.trim();

  if (parameter.data_type === "number") {
    return trimmedValue.replace(",", ".");
  }

  if (parameter.data_type === "datetime") {
    const date = new Date(trimmedValue);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return trimmedValue;
};

function ParameterInput({
  disabled,
  onChange,
  parameter,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  parameter: EquipmentParameter;
  value: string;
}) {
  if (parameter.data_type === "select") {
    const options = getParameterSelectOptions(parameter);

    if (options.length > 0) {
      return (
        <Select disabled={disabled} value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn giá trị" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        disabled={disabled}
        placeholder="Nhập lựa chọn"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (parameter.data_type === "boolean") {
    return (
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Chọn giá trị" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Đạt / Đúng</SelectItem>
          <SelectItem value="false">Không đạt / Sai</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (parameter.data_type === "date") {
    return (
      <Input
        type="date"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (parameter.data_type === "datetime") {
    return (
      <Input
        type="datetime-local"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (parameter.data_type === "number") {
    return (
      <Input
        type="number"
        step="any"
        inputMode="decimal"
        disabled={disabled}
        placeholder="Nhập số"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      disabled={disabled}
      placeholder="Nhập nội dung"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function EquipmentMonitoringRecordsSection({
  isLoading,
  onOpenRecordDetail,
  records,
  recordsError,
}: {
  isLoading: boolean;
  onOpenRecordDetail: (recordId: number) => void;
  records: EquipmentMonitoringRecord[];
  recordsError: unknown;
}) {
  const handleOpenRecordDetail = (recordId: number) => {
    onOpenRecordDetail(recordId);
  };
  const equipmentGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        equipmentLabel: string;
        records: EquipmentMonitoringRecord[];
        parameterColumns: {
          id: number;
          label: string;
          unit?: string | null;
        }[];
      }
    >();
    const sortRecords = (
      first: EquipmentMonitoringRecord,
      second: EquipmentMonitoringRecord,
    ) => {
      const firstTime = new Date(
        first.recorded_at ?? first.created_at ?? "",
      ).getTime();
      const secondTime = new Date(
        second.recorded_at ?? second.created_at ?? "",
      ).getTime();

      if (!Number.isNaN(firstTime) && !Number.isNaN(secondTime)) {
        return secondTime - firstTime;
      }

      return Number(second.id ?? 0) - Number(first.id ?? 0);
    };

    records.forEach((record) => {
      const groupKey = String(record.equipment_id);
      const equipmentLabel = getEquipmentLabel(record);
      const currentGroup = groups.get(groupKey) ?? {
        equipmentLabel,
        records: [],
        parameterColumns: [],
      };
      const columnMap = new Map(
        currentGroup.parameterColumns.map((column) => [column.id, column]),
      );

      (record.values ?? []).forEach((value) => {
        if (!columnMap.has(value.parameter_id)) {
          columnMap.set(value.parameter_id, {
            id: value.parameter_id,
            label: value.parameter?.name ?? `Thông số #${value.parameter_id}`,
            unit: value.parameter?.unit,
          });
        }
      });

      currentGroup.records.push(record);
      currentGroup.parameterColumns = Array.from(columnMap.values());
      groups.set(groupKey, currentGroup);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      records: group.records.slice().sort(sortRecords),
    }));
  }, [records]);

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Thông số thiết bị đã nhập
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Các lần theo dõi thông số thiết bị của lệnh sản xuất này.
        </p>
      </div>

      {recordsError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không thể tải thông số thiết bị đã nhập.
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      ) : equipmentGroups.length > 0 ? (
        <div className="space-y-5">
          {equipmentGroups.map((group) => (
            <div key={group.equipmentLabel} className="space-y-2">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <h3 className="font-semibold text-gray-900">
                  {group.equipmentLabel}
                </h3>
                <Badge variant="secondary">
                  {group.records.length} lần nhập
                </Badge>
              </div>

              <div className="overflow-x-auto rounded border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-36">Thời điểm</TableHead>
                      <TableHead className="min-w-32">Người nhập</TableHead>
                      {group.parameterColumns.map((parameter) => (
                        <TableHead key={parameter.id} className="min-w-36">
                          {parameter.label}
                          {parameter.unit ? (
                            <span className="font-normal text-gray-500">
                              {` (${parameter.unit})`}
                            </span>
                          ) : null}
                        </TableHead>
                      ))}
                      <TableHead className="min-w-40">Ghi chú</TableHead>
                      <TableHead className="w-20 text-right">
                        Chi tiết
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.records.map((record) => {
                      const valueByParameterId = new Map(
                        (record.values ?? []).map((value) => [
                          value.parameter_id,
                          value,
                        ]),
                      );

                      return (
                        <TableRow
                          key={record.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenRecordDetail(record.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleOpenRecordDetail(record.id);
                            }
                          }}
                          className="cursor-pointer hover:bg-blue-50"
                        >
                          <TableCell className="align-top text-sm">
                            {formatDateTime(
                              record.recorded_at ?? record.created_at,
                            )}
                          </TableCell>
                          <TableCell className="align-top text-sm">
                            {getUserLabel(record.createdBy)}
                          </TableCell>
                          {group.parameterColumns.map((parameter) => {
                            const value = valueByParameterId.get(parameter.id);

                            return (
                              <TableCell
                                key={parameter.id}
                                className="align-top text-sm"
                              >
                                {value?.value ?? ""}
                                {value?.note ? (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {value.note}
                                  </p>
                                ) : null}
                              </TableCell>
                            );
                          })}
                          <TableCell className="align-top text-sm">
                            {record.note ?? ""}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <button
                              type="button"
                              title="Chi tiết"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenRecordDetail(record.id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[9999px] bg-blue-500 text-white transition hover:bg-blue-600"
                            >
                              <Eye className="size-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có thông số thiết bị nào được nhập.
        </div>
      )}
    </div>
  );
}

function EquipmentMonitoringRecordDetailView({
  onBack,
  recordId,
}: {
  onBack: () => void;
  recordId: number;
}) {
  const {
    data: record,
    error,
    isLoading,
  } = useSWR(API_ROUTES.equipment.monitoringRecordDetail(recordId), () =>
    equipmentService.fetchEquipmentMonitoringRecordById(recordId),
  );

  return (
    <div className="w-full max-w-4xl rounded-md bg-white p-4 shadow-md">
      <DetailPanelHeader
        title="Chi tiết thông số thiết bị"
        subtitle={record ? getEquipmentLabel(record) : ""}
        onClose={onBack}
      />

      {error ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không thể tải chi tiết thông số thiết bị.
        </div>
      ) : isLoading ? (
        <div className="mt-4 flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Đang tải chi tiết
        </div>
      ) : record ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="font-medium text-gray-700">
                Thời điểm ghi nhận:
              </span>
              <span>
                {formatDateTime(record.recorded_at ?? record.created_at) || "-"}
              </span>
            </div>
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="font-medium text-gray-700">Người nhập:</span>
              <span>{getUserLabel(record.createdBy) || "-"}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="font-medium text-gray-700">Thiết bị:</span>
              <span>{getEquipmentLabel(record)}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="font-medium text-gray-700">Ghi chú:</span>
              <span>{record.note || "-"}</span>
            </div>

            {(record.values ?? []).map((value) => (
              <div
                key={value.id ?? value.parameter_id}
                className="grid gap-1 sm:grid-cols-[180px_1fr]"
              >
                <span className="font-medium text-gray-700">
                  {value.parameter?.name ?? `Thông số #${value.parameter_id}`}
                  {value.parameter?.unit ? ` (${value.parameter.unit})` : ""}:
                </span>
                <span>
                  {value.value || "-"}
                  {value.note ? (
                    <span className="ml-2 text-gray-500">({value.note})</span>
                  ) : null}
                </span>
              </div>
            ))}

            <div className="grid gap-2 pt-1 sm:grid-cols-[180px_1fr]">
              <span className="font-medium text-gray-700">Hình ảnh:</span>
              <div className="space-y-3">
                {(record.images ?? []).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(record.images ?? []).map((image, index) => (
                      <AuthenticatedEquipmentMonitoringImage
                        key={image.id}
                        imagePath={image.image_path}
                        label={`Ảnh thông số thiết bị ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">Chưa có hình ảnh.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function FormEquipmentMonitoringRecord({
  id,
  itemCode,
  onClose,
  productionOrderId,
}: {
  id?: string | number;
  itemCode?: string | number | null;
  onClose?: () => void;
  productionOrderId?: string | number | null;
}) {
  const normalizedItemCode = itemCode ? String(itemCode) : "";
  const effectiveProductionOrderId = productionOrderId ?? id;
  const numericProductionOrderId = Number(effectiveProductionOrderId);
  const monitoringRecordsKey =
    numericProductionOrderId && !Number.isNaN(numericProductionOrderId)
      ? [
          API_ROUTES.equipment.monitoringRecords,
          "production_order_id",
          numericProductionOrderId,
        ]
      : null;
  const [selectedItemEquipment, setSelectedItemEquipment] =
    useState<ItemEquipment | null>(null);
  const [selectedMonitoringRecordId, setSelectedMonitoringRecordId] = useState<
    number | null
  >(null);
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<number, string>>({});
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: itemEquipment,
    error,
    isLoading,
  } = useSWR(
    normalizedItemCode ? API_ROUTES.items.equipment(normalizedItemCode) : null,
    () => itemsService.fetchItemEquipment(normalizedItemCode),
  );
  const {
    data: monitoringRecords = [],
    error: monitoringRecordsError,
    isLoading: isMonitoringRecordsLoading,
  } = useSWR(monitoringRecordsKey, () =>
    equipmentService.fetchEquipmentMonitoringRecords({
      production_order_id: numericProductionOrderId,
    }),
  );

  const sortedItemEquipment = useMemo(
    () =>
      (itemEquipment ?? [])
        .slice()
        .sort((first, second) =>
          first.equipment.code.localeCompare(second.equipment.code),
        ),
    [itemEquipment],
  );

  const selectedParameters = useMemo(
    () => selectedItemEquipment?.equipment.parameters ?? [],
    [selectedItemEquipment],
  );

  const handleSelectEquipment = (entry: ItemEquipment) => {
    setSelectedItemEquipment(entry);
    setValues({});
    setNote("");
    setImages([]);
  };

  const handleBackToEquipmentList = () => {
    setSelectedItemEquipment(null);
    setValues({});
    setNote("");
    setImages([]);
  };

  const handleChangeValue = (parameterId: number, value: string) => {
    setValues((current) => ({
      ...current,
      [parameterId]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!numericProductionOrderId || Number.isNaN(numericProductionOrderId)) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (!selectedItemEquipment) {
      toast.error("Vui lòng chọn thiết bị.");
      return;
    }

    if (selectedParameters.length === 0) {
      toast.error("Thiết bị chưa có thông số để nhập.");
      return;
    }

    const missingRequiredParameter = selectedParameters.find(
      (parameter) =>
        parameter.is_required && !String(values[parameter.id] ?? "").trim(),
    );

    if (missingRequiredParameter) {
      toast.error(`Vui lòng nhập ${missingRequiredParameter.name}.`);
      return;
    }

    const payloadValues = selectedParameters
      .map((parameter) => {
        const value = normalizeParameterValue(
          parameter,
          String(values[parameter.id] ?? ""),
        );

        return {
          parameter_id: parameter.id,
          value,
        };
      })
      .filter((entry) => entry.value.length > 0);

    if (payloadValues.length === 0) {
      toast.error("Vui lòng nhập ít nhất một thông số thiết bị.");
      return;
    }

    setIsSubmitting(true);

    try {
      const createdRecord =
        await equipmentService.createEquipmentMonitoringRecord({
          production_order_id: numericProductionOrderId,
          equipment_id: selectedItemEquipment.equipment_id,
          note: note.trim() || undefined,
          values: payloadValues,
        });

      let imagesUploaded = true;
      if (images.length > 0) {
        try {
          await equipmentService.addEquipmentMonitoringRecordImages(
            createdRecord.id,
            images,
          );
        } catch (uploadError) {
          imagesUploaded = false;
          toast.error(
            `Đã lưu thông số nhưng không thể tải ảnh lên: ${getErrorMessage(
              uploadError,
              "Bạn có thể thêm lại ảnh trong màn chi tiết.",
            )}`,
          );
          console.error(
            "Error uploading equipment monitoring record images:",
            uploadError,
          );
        }
      }

      if (imagesUploaded) {
        toast.success(
          images.length > 0
            ? "Đã lưu thông số và hình ảnh thiết bị."
            : "Đã lưu thông số thiết bị.",
        );
      }
      if (monitoringRecordsKey) {
        await mutate(monitoringRecordsKey);
      }
      setSelectedItemEquipment(null);
      setValues({});
      setNote("");
      setImages([]);
    } catch (submitError) {
      toast.error(
        getErrorMessage(submitError, "Không thể lưu thông số thiết bị."),
      );
      console.error("Error creating equipment monitoring record:", submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!normalizedItemCode) {
    return (
      <div className="w-full max-w-4xl rounded-md bg-white p-4 shadow-md">
        {onClose ? (
          <DetailPanelHeader title="Nhập thông số thiết bị" onClose={onClose} />
        ) : null}
        <p className="mt-4 text-sm text-red-600">Không tìm thấy mã sản phẩm.</p>
      </div>
    );
  }

  if (selectedMonitoringRecordId) {
    return (
      <EquipmentMonitoringRecordDetailView
        recordId={selectedMonitoringRecordId}
        onBack={() => setSelectedMonitoringRecordId(null)}
      />
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="rounded-md bg-white p-4 shadow-md">
        {onClose ? (
          <DetailPanelHeader
            title="Nhập thông số thiết bị"
            subtitle={normalizedItemCode}
            onClose={onClose}
          />
        ) : (
          <div className="mb-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Nhập thông số thiết bị
            </p>
            <p className="mt-1 text-center text-sm text-gray-500">
              {normalizedItemCode}
            </p>
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách thiết bị của mã hàng.
          </div>
        ) : isLoading ? (
          <div className="mt-4 flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Đang tải thiết bị
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedItemEquipment.length > 0 ? (
              sortedItemEquipment.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleSelectEquipment(entry)}
                  className="w-full rounded border bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 focus:border-blue-400 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {entry.equipment.code} - {entry.equipment.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {(entry.equipment.parameters ?? []).length} thông số
                      </p>
                    </div>
                    <div className="inline-flex flex-col items-center">
                      <div
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 text-white md:h-10 md:w-10 [&_svg]:min-h-5 [&_svg]:min-w-5"
                      >
                        <Settings2 className="size-5" />
                      </div>
                      <p className="mt-1 w-[82px] text-center text-[13px] font-semibold leading-tight text-gray-700 md:w-[90px] md:text-[14px]">
                        Chọn thiết bị
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
                Item này chưa được gán thiết bị.
              </div>
            )}
          </div>
        )}

        <Dialog
          open={Boolean(selectedItemEquipment)}
          onOpenChange={(open) => {
            if (!open && !isSubmitting) {
              handleBackToEquipmentList();
            }
          }}
        >
          <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>Nhập thông số thiết bị</DialogTitle>
              <DialogDescription>
                {selectedItemEquipment
                  ? `${selectedItemEquipment.equipment.code} - ${selectedItemEquipment.equipment.name}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto pr-1">
              {selectedItemEquipment ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {selectedParameters.length > 0 ? (
                    <div className="space-y-4">
                      {selectedParameters.map((parameter) => (
                        <div key={parameter.id} className="space-y-2">
                          <Label
                            htmlFor={`equipment-parameter-${parameter.id}`}
                          >
                            {parameter.name}
                            {parameter.unit ? (
                              <span className="font-normal text-gray-500">
                                {` (${parameter.unit})`}
                              </span>
                            ) : null}
                            {parameter.is_required ? (
                              <span className="text-red-600"> *</span>
                            ) : null}
                          </Label>
                          <ParameterInput
                            disabled={isSubmitting}
                            parameter={parameter}
                            value={values[parameter.id] ?? ""}
                            onChange={(value) =>
                              handleChangeValue(parameter.id, value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
                      Thiết bị này chưa có thông số.
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="equipment-note">Ghi chú</Label>
                    <Input
                      id="equipment-note"
                      disabled={isSubmitting}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>

                  <EquipmentMonitoringImagePicker
                    id="new-equipment-monitoring-record"
                    images={images}
                    disabled={isSubmitting}
                    onChange={setImages}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={handleBackToEquipmentList}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || selectedParameters.length === 0}
                    >
                      {isSubmitting ? "Đang lưu..." : "Lưu thông số"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <EquipmentMonitoringRecordsSection
        isLoading={isMonitoringRecordsLoading}
        onOpenRecordDetail={setSelectedMonitoringRecordId}
        records={monitoringRecords}
        recordsError={monitoringRecordsError}
      />
    </div>
  );
}
