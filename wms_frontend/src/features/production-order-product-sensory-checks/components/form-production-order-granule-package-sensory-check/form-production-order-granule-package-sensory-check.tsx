"use client";

import * as React from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  ProductionOrderProductSensoryCheck,
  ProductSensoryCheckPayload,
  UnitSensoryResultKey,
} from "../../types";
import { UNIT_RESULT_KEYS, formatDosageFormStage } from "../../utils";
import PassFailResultToggle, {
  type PassFailResultValue,
} from "../pass-fail-result-toggle/pass-fail-result-toggle";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const toResultValue = (
  value: boolean | null | undefined,
): PassFailResultValue => {
  if (value === true) {
    return "pass";
  }

  if (value === false) {
    return "fail";
  }

  return "";
};

const toPayloadValue = (value: PassFailResultValue) => {
  if (value === "") {
    return null;
  }

  return value === "pass";
};

const createDefaultResults = () =>
  UNIT_RESULT_KEYS.reduce(
    (values, unitKey) => ({
      ...values,
      [unitKey]: "",
    }),
    {} as Record<UnitSensoryResultKey, PassFailResultValue>,
  );

const getFormResults = (
  data?: ProductionOrderProductSensoryCheck | null,
) =>
  UNIT_RESULT_KEYS.reduce(
    (values, unitKey) => ({
      ...values,
      [unitKey]: toResultValue(data?.[unitKey]),
    }),
    {} as Record<UnitSensoryResultKey, PassFailResultValue>,
  );

const normalizeRequirement = (value: string | null | undefined) => {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue === "" ? null : trimmedValue;
};

const normalizeDosageFormStage = (value: string | null | undefined) => {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue === "" ? null : trimmedValue;
};

const GRANULE_PACKAGE_SENSORY_REQUIREMENT = [
  "- Tần suất kiểm tra: 30 phút/lần.",
  "- Hình dạng: vuông vắn, mép đều, không cắt lệch, mép hàn không lệch quá 1 mm, không dập vào cốm.",
  "- Màu sắc: không lem màu, không có bất thường về màu sắc.",
].join("\n");

const TABLET_WEIGHT_SENSORY_REQUIREMENT = [
  "- Tần suất kiểm tra: 30 phút/lần.",
  "- Hình thức: viên đều, không sứt cạnh, không bong mặt, không tách lớp, không xước.",
  "- Màu sắc: màu sắc viên đồng nhất, không có chấm trên viên.",
].join("\n");

const CAPSULE_SENSORY_REQUIREMENT = [
  "- Tần suất kiểm tra: 30 phút/lần.",
  "- Hình thức: viên nang nguyên vẹn, nang khớp hoàn toàn, không móp méo, không nứt vỡ, không hở nang, không dính bột.",
  "- Màu sắc: màu sắc viên đồng nhất, không có chấm, vết bẩn hoặc bất thường về màu sắc.",
].join("\n");

const BOTTLE_SENSORY_REQUIREMENT = [
  "- Hình thức: lọ tròn đều, không xước, không móp méo biến dạng, không đứt doăng.",
  "- Màu sắc: đồng nhất, không vết bẩn, không chấm đen.",
].join("\n");

const BLISTER_SENSORY_REQUIREMENT = [
  "- Tần suất kiểm tra: 30 phút/lần.",
  "- Hình thức: vỉ nguyên vẹn, không móp méo, không rách, không hở mép hàn, không dính bẩn.",
  "- Màu sắc: màu sắc đồng nhất, không lem màu, không có vết bẩn hoặc bất thường về màu sắc.",
].join("\n");

const SOLUTION_PACKAGE_SENSORY_REQUIREMENT = [
  "- Tần suất kiểm tra: 30 phút/lần.",
  "- Hình thức: gói dịch nguyên vẹn, mép hàn đều, 2 vai gói đều, date rõ ràng, không mờ, không nhòe, không có hiện tượng bung màng, không rách, không hở mép hàn, không dính bẩn.",
  "- Màu sắc: màu sắc đồng nhất, không có vết bẩn hoặc bất thường về màu sắc.",
].join("\n");

type ProductionOrderFixedRequirementSensoryCheckFormProps = {
  productionOrderId: string | number;
  data?: ProductionOrderProductSensoryCheck | null;
  onClose?: () => void;
  onSaved?: (data: ProductionOrderProductSensoryCheck) => void;
  title?: string;
  requirementText?: string;
  unitLabel?: string;
  dosageFormStage?: string;
  consoleErrorContext?: string;
  allowRequirementUpdate?: boolean;
};

function FormProductionOrderFixedRequirementSensoryCheck({
  productionOrderId,
  data,
  onClose,
  onSaved,
  title = "Kiểm tra cảm quan gói cốm",
  requirementText = GRANULE_PACKAGE_SENSORY_REQUIREMENT,
  unitLabel = "Gói cốm",
  dosageFormStage = "Gói cốm",
  consoleErrorContext = "fixed requirement sensory check",
  allowRequirementUpdate = true,
}: ProductionOrderFixedRequirementSensoryCheckFormProps) {
  const isEditing = Boolean(data?.id);
  const requirement = requirementText;
  const lowerTitle = title.toLocaleLowerCase("vi-VN");
  const [dosageFormStageValue, setDosageFormStageValue] = React.useState(
    () => data?.dosage_form_stage ?? dosageFormStage,
  );
  const [unitResults, setUnitResults] = React.useState(() =>
    data ? getFormResults(data) : createDefaultResults(),
  );
  const [images, setImages] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const listKey = productionOrderId
    ? API_ROUTES.productionOrders.productSensoryChecks(productionOrderId)
    : null;

  const resetForm = () => {
    setDosageFormStageValue(data?.dosage_form_stage ?? dosageFormStage);
    setUnitResults(data ? getFormResults(data) : createDefaultResults());
    setImages([]);
  };

  const existingImageCount = data?.images?.length ?? 0;

  const addImages = (files: FileList | null) => {
    const selectedImages = Array.from(files ?? []);

    if (selectedImages.length === 0) return;

    if (selectedImages.some((image) => !ALLOWED_IMAGE_TYPES.has(image.type))) {
      toast.error("Ảnh chỉ nhận JPG, PNG, WEBP hoặc GIF.");
      return;
    }

    const oversizedImage = selectedImages.find(
      (image) => image.size > MAX_IMAGE_SIZE_BYTES,
    );
    if (oversizedImage) {
      toast.error(`Ảnh ${oversizedImage.name} vượt quá dung lượng 20MB.`);
      return;
    }

    const nextImages = [...images, ...selectedImages];
    if (existingImageCount + nextImages.length > MAX_IMAGES) {
      toast.error(`Mỗi lần kiểm tra có tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    setImages(nextImages);
  };

  const handleUnitChange = (
    unitKey: UnitSensoryResultKey,
    value: PassFailResultValue,
  ) => {
    setUnitResults((currentValues) => ({
      ...currentValues,
      [unitKey]: value,
    }));
  };

  const buildCreatePayload = (): ProductSensoryCheckPayload => {
    return UNIT_RESULT_KEYS.reduce(
      (values, unitKey) => ({
        ...values,
        [unitKey]: toPayloadValue(unitResults[unitKey]),
      }),
      {
        requirement: normalizeRequirement(requirement),
        dosage_form_stage: normalizeDosageFormStage(dosageFormStageValue),
      } as ProductSensoryCheckPayload,
    );
  };

  const buildUpdatePayload = () => {
    const payload: Partial<ProductSensoryCheckPayload> = {};
    const nextRequirement = normalizeRequirement(requirement);
    const currentRequirement = normalizeRequirement(data?.requirement);

    if (allowRequirementUpdate && nextRequirement !== currentRequirement) {
      payload.requirement = nextRequirement;
    }

    const nextDosageFormStage =
      normalizeDosageFormStage(dosageFormStageValue);
    const currentDosageFormStage = normalizeDosageFormStage(
      data?.dosage_form_stage,
    );

    if (nextDosageFormStage !== currentDosageFormStage) {
      payload.dosage_form_stage = nextDosageFormStage;
    }

    UNIT_RESULT_KEYS.forEach((unitKey) => {
      const nextValue = toPayloadValue(unitResults[unitKey]);
      const currentValue = data?.[unitKey] ?? null;

      if (nextValue !== currentValue) {
        payload[unitKey] = nextValue;
      }
    });

    return payload;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (!unitResults.unit_1_result) {
      toast.error(`Vui lòng chọn kết quả ${unitLabel.toLocaleLowerCase("vi-VN")} 1.`);
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing) {
        if (data?.id === null || data?.id === undefined) {
          toast.error(`Không tìm thấy bản ghi ${lowerTitle}.`);
          return;
        }

        const updatePayload = buildUpdatePayload();

        if (Object.keys(updatePayload).length === 0 && images.length === 0) {
          toast.info("Không có thay đổi để cập nhật.");
          return;
        }

        let savedData = data;

        if (Object.keys(updatePayload).length > 0) {
          savedData = await productionOrdersService.updateProductSensoryCheck(
            data.id,
            updatePayload,
          );
        }

        if (images.length > 0) {
          savedData = await productionOrdersService.addProductSensoryCheckImages(
            data.id,
            images,
          );
        }

        toast.success(`Đã cập nhật ${lowerTitle}.`);
        await mutate(
          API_ROUTES.productionOrders.productSensoryCheckDetail(data.id),
        );
        if (listKey) {
          await mutate(listKey);
        }
        onSaved?.(savedData);
        onClose?.();
        return;
      }

      const savedData =
        await productionOrdersService.createProductSensoryCheck(
          productionOrderId,
          buildCreatePayload(),
        );

      if (images.length > 0) {
        if (savedData?.id === null || savedData?.id === undefined) {
          throw new Error("Không tìm thấy bản ghi để thêm ảnh.");
        }

        await productionOrdersService.addProductSensoryCheckImages(
          savedData.id,
          images,
        );
      }

      toast.success(`Đã lưu ${lowerTitle}.`);
      setUnitResults(createDefaultResults());
      setImages([]);
      if (listKey) {
        await mutate(listKey);
      }
      onSaved?.(savedData);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, `Không thể lưu ${lowerTitle}.`),
      );
      console.error(`Error saving ${consoleErrorContext}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[420px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[388px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            {isEditing ? `Cập nhật ${lowerTitle}` : title}
          </p>

          <div className="space-y-2">
            <Label>Yêu cầu</Label>
            <Textarea
              value={requirement}
              readOnly
              disabled={isSubmitting}
              className="min-h-24 bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Dạng bào chế</Label>
            <Input
              value={
                isEditing
                  ? dosageFormStageValue
                  : formatDosageFormStage(dosageFormStageValue)
              }
              readOnly={!isEditing}
              disabled={isSubmitting}
              className={!isEditing ? "bg-gray-50" : undefined}
              placeholder="Viên nén, Viên nang, Viên nén bao phim"
              onChange={(event) =>
                setDosageFormStageValue(event.target.value)
              }
            />
          </div>

          <div className="flex flex-col gap-3">
            {UNIT_RESULT_KEYS.map((unitKey, index) => (
              <div key={unitKey} className="space-y-2">
                <Label>
                  {unitLabel} {index + 1}
                  {index === 0 ? " *" : ""}
                </Label>
                <PassFailResultToggle
                  value={unitResults[unitKey]}
                  disabled={isSubmitting}
                  onChange={(value) => handleUnitChange(unitKey, value)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Ảnh kiểm tra</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              disabled={isSubmitting}
              onChange={(event) => {
                addImages(event.target.files);
                event.target.value = "";
              }}
            />
            <Input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="environment"
              className="sr-only"
              disabled={isSubmitting}
              onChange={(event) => {
                addImages(event.target.files);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp className="size-4" /> Chọn ảnh
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4" /> Chụp ảnh
              </Button>
            </div>
            {images.length > 0 ? (
              <ul className="space-y-1 rounded border bg-gray-50 p-2 text-sm">
                {images.map((image, index) => (
                  <li
                    key={`${image.name}-${image.lastModified}-${index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{image.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isSubmitting}
                      aria-label={`Bỏ ảnh ${image.name}`}
                      onClick={() =>
                        setImages((currentImages) =>
                          currentImages.filter(
                            (_, imageIndex) => imageIndex !== index,
                          ),
                        )
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={isEditing ? onClose : resetForm}
          >
            {isEditing ? "Hủy" : "Đặt lại"}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className={isEditing ? "bg-blue-500 text-white hover:bg-blue-600" : ""}
          >
            {isSubmitting
              ? isEditing
                ? "Đang cập nhật..."
                : "Đang lưu..."
              : isEditing
                ? "Cập nhật"
                : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormProductionOrderGranulePackageSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan gói cốm"
      requirementText={GRANULE_PACKAGE_SENSORY_REQUIREMENT}
      unitLabel="Gói cốm"
      dosageFormStage="Gói cốm"
      consoleErrorContext="granule package sensory check"
    />
  );
}

export {
  FormProductionOrderFixedRequirementSensoryCheck,
  FormProductionOrderGranulePackageSensoryCheck,
  BLISTER_SENSORY_REQUIREMENT,
  BOTTLE_SENSORY_REQUIREMENT,
  CAPSULE_SENSORY_REQUIREMENT,
  GRANULE_PACKAGE_SENSORY_REQUIREMENT,
  SOLUTION_PACKAGE_SENSORY_REQUIREMENT,
  TABLET_WEIGHT_SENSORY_REQUIREMENT,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
};

export default FormProductionOrderGranulePackageSensoryCheck;
