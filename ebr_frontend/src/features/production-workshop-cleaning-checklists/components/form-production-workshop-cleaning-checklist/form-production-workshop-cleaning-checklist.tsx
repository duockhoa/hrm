"use client";

import {
  QrInputButton,
  QrScanDialog,
} from "@/components/qr-scan-dialog/qr-scan-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cleaningRequirementsService,
  productionWorkshopsService,
} from "@/services/index.service";
import useUserStore from "@/store/user.store";
import { FormEvent, useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  CreateProductionWorkshopCleaningChecklistPayload,
  ProductionWorkshopCleaningChecklist,
} from "../../types";
import type {
  CleaningObjectWithRequirements,
} from "@/features/cleaning-requirements";

type FormState = {
  qr_code: string;
  subject: string;
  category: string;
  requirement: string;
  result: string;
  note: string;
};

type FormProductionWorkshopCleaningChecklistProps = {
  workshopId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cleaningChecklist?: ProductionWorkshopCleaningChecklist | null;
  onSaved: () => void | Promise<void>;
};

const emptyForm: FormState = {
  qr_code: "",
  subject: "",
  category: "Đầu ca",
  requirement: "",
  result: "Đạt",
  note: "",
};

const getInitialForm = (
  cleaningChecklist?: ProductionWorkshopCleaningChecklist | null,
): FormState => {
  if (!cleaningChecklist) {
    return emptyForm;
  }

  return {
    qr_code: "",
    subject: cleaningChecklist.subject ?? "",
    category: cleaningChecklist.category ?? "",
    requirement: cleaningChecklist.requirement ?? "",
    result: cleaningChecklist.result ?? "",
    note: cleaningChecklist.note ?? "",
  };
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const subjectQrKeys = [
  "qr_code",
  "qrcode",
  "qr",
  "subject",
  "object",
  "equipment",
  "name",
  "code",
  "doi_tuong",
  "đối_tượng",
];

const getValueByKeys = (source: Record<string, unknown>, keys: string[]) => {
  const sourceEntries = Object.entries(source);

  for (const key of keys) {
    const match = sourceEntries.find(
      ([sourceKey]) => sourceKey.toLowerCase() === key.toLowerCase(),
    );

    if (match?.[1] !== undefined && match[1] !== null) {
      return String(match[1]);
    }
  }

  return null;
};

const parseQrSubject = (decodedText: string) => {
  const text = decodedText.trim();

  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const value = getValueByKeys(
        json as Record<string, unknown>,
        subjectQrKeys,
      );
      if (value) {
        return value.trim();
      }
    }
  } catch {
    // QR may be plain text, a URL, or query params.
  }

  try {
    const url = new URL(text);
    const value = getValueByKeys(
      Object.fromEntries(url.searchParams.entries()),
      subjectQrKeys,
    );
    if (value) {
      return value.trim();
    }
  } catch {
    const params = new URLSearchParams(text);
    const value = getValueByKeys(
      Object.fromEntries(params.entries()),
      subjectQrKeys,
    );
    if (value) {
      return value.trim();
    }
  }

  return text;
};

const findRequirementForCategory = (
  cleaningObject: CleaningObjectWithRequirements,
  category: string,
) => {
  const normalizedCategory = category.trim().toLocaleLowerCase("vi-VN");

  return cleaningObject.cleaningRequirements.find(
    (requirement) =>
      requirement.requirement_type
        .trim()
        .toLocaleLowerCase("vi-VN") === normalizedCategory,
  );
};

export default function FormProductionWorkshopCleaningChecklist({
  workshopId,
  open,
  onOpenChange,
  cleaningChecklist,
  onSaved,
}: FormProductionWorkshopCleaningChecklistProps) {
  const [form, setForm] = useState<FormState>(() =>
    getInitialForm(cleaningChecklist),
  );
  const [selectedCleaningObject, setSelectedCleaningObject] =
    useState<CleaningObjectWithRequirements | null>(null);
  const [isSubjectQrScannerOpen, setIsSubjectQrScannerOpen] = useState(false);
  const [isLoadingCleaningObject, setIsLoadingCleaningObject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUserStore();
  const isEditing = Boolean(cleaningChecklist);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const fillRequirementFromCleaningObject = useCallback(
    (cleaningObject: CleaningObjectWithRequirements, category: string) => {
      const requirement = findRequirementForCategory(cleaningObject, category);

      setForm((current) => ({
        ...current,
        qr_code: cleaningObject.qr_code,
        subject: cleaningObject.name,
        category,
        requirement: requirement?.requirement_content ?? "",
      }));

      if (!requirement) {
        toast.warning(
          `Chưa có yêu cầu ${category.toLocaleLowerCase("vi-VN")} cho đối tượng này.`,
        );
      }
    },
    [],
  );

  const loadCleaningObjectByQrCode = useCallback(
    async (qrCode: string, category: string) => {
      const normalizedQrCode = parseQrSubject(qrCode);

      if (!normalizedQrCode) {
        toast.error("Không đọc được mã QR đối tượng.");
        return;
      }

      setIsLoadingCleaningObject(true);
      try {
        const cleaningObject =
          await cleaningRequirementsService.fetchCleaningObjectByQrCode(
            normalizedQrCode,
          );
        setSelectedCleaningObject(cleaningObject);
        fillRequirementFromCleaningObject(cleaningObject, category);
      } catch (error) {
        setSelectedCleaningObject(null);
        setForm((current) => ({
          ...current,
          qr_code: normalizedQrCode,
          subject: "",
          requirement: "",
        }));
        toast.error(
          getErrorMessage(error, "Không tìm thấy đối tượng theo mã QR này."),
        );
      } finally {
        setIsLoadingCleaningObject(false);
      }
    },
    [fillRequirementFromCleaningObject],
  );

  const handleQrScan = useCallback(
    async (decodedText: string) => {
      await loadCleaningObjectByQrCode(decodedText, form.category);
    },
    [form.category, loadCleaningObjectByQrCode],
  );

  const handleQrCodeChange = (value: string) => {
    setSelectedCleaningObject(null);
    setForm((current) => ({
      ...current,
      qr_code: value,
      subject: "",
      requirement: "",
    }));
  };

  const handleCategoryChange = (category: string) => {
    if (selectedCleaningObject) {
      fillRequirementFromCleaningObject(selectedCleaningObject, category);
      return;
    }

    updateField("category", category);
    if (form.qr_code.trim()) {
      void loadCleaningObjectByQrCode(form.qr_code, category);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requiredFields: Array<[keyof FormState, string]> = [
      ["qr_code", "mã QR đối tượng"],
      ["subject", "đối tượng vệ sinh"],
      ["category", "loại vệ sinh"],
      ["requirement", "yêu cầu"],
      ["result", "kết quả"],
    ];
    const missingField = requiredFields.find(
      ([field]) => !form[field].trim(),
    );

    if (missingField) {
      toast.error(`Vui lòng nhập ${missingField[1]}.`);
      return;
    }

    const cleanedById = Number(user?.id);
    if (!Number.isInteger(cleanedById) || cleanedById <= 0) {
      toast.error("Không tìm thấy người dùng hiện tại.");
      return;
    }

    const payload: CreateProductionWorkshopCleaningChecklistPayload = {
      subject: form.subject.trim(),
      category: form.category.trim(),
      requirement: form.requirement.trim(),
      result: form.result.trim(),
      note: form.note.trim() || null,
      cleaned_by_id: cleanedById,
    };

    setIsSubmitting(true);
    try {
      if (cleaningChecklist) {
        await productionWorkshopsService.updateCleaningChecklist(
          cleaningChecklist.id,
          payload,
        );
        toast.success("Đã cập nhật checklist vệ sinh.");
      } else {
        await productionWorkshopsService.createCleaningChecklist(
          workshopId,
          payload,
        );
        toast.success("Đã thêm checklist vệ sinh.");
      }

      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu checklist vệ sinh."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center text-xl">
            {isEditing
              ? "Cập nhật checklist vệ sinh"
              : "Thêm checklist vệ sinh"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cleaning-qr-code">
              Mã QR đối tượng <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full">
              <Input
                id="cleaning-qr-code"
                className="pr-11"
                value={form.qr_code}
                disabled={isSubmitting || isLoadingCleaningObject}
                placeholder="Nhập hoặc quét mã QR đối tượng"
                onChange={(event) => handleQrCodeChange(event.target.value)}
                onBlur={() => {
                  if (form.qr_code.trim()) {
                    void loadCleaningObjectByQrCode(
                      form.qr_code,
                      form.category,
                    );
                  }
                }}
              />
              <QrInputButton
                disabled={isSubmitting || isLoadingCleaningObject}
                onClick={() => setIsSubjectQrScannerOpen(true)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cleaning-subject">
              Đối tượng vệ sinh <span className="text-red-500">*</span>
            </label>
            <Input
              id="cleaning-subject"
              value={form.subject}
              readOnly
              disabled={isLoadingCleaningObject}
              className="bg-gray-50"
              placeholder="Tự động điền theo mã QR"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cleaning-category">
              Loại vệ sinh <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.category}
              disabled={isSubmitting || isLoadingCleaningObject}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="cleaning-category" className="w-full">
                <SelectValue placeholder="Chọn loại vệ sinh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Đầu ca">Đầu ca</SelectItem>
                <SelectItem value="Cuối ca">Cuối ca</SelectItem>
                <SelectItem value="Định kỳ">Định kỳ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="cleaning-requirement"
            >
              Yêu cầu <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="cleaning-requirement"
              className="min-h-20 resize-y"
              value={form.requirement}
              readOnly
              disabled={isLoadingCleaningObject}
              placeholder="Tự động điền theo mã QR và loại vệ sinh"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Kết quả <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.result === "Đạt" ? "default" : "outline"}
                disabled={isSubmitting}
                onClick={() => updateField("result", "Đạt")}
              >
                Đạt
              </Button>
              <Button
                type="button"
                variant={form.result === "Không đạt" ? "destructive" : "outline"}
                disabled={isSubmitting}
                onClick={() => updateField("result", "Không đạt")}
              >
                Không đạt
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cleaning-note">
              Ghi chú
            </label>
            <Textarea
              id="cleaning-note"
              className="min-h-20 resize-y"
              value={form.note}
              disabled={isSubmitting}
              placeholder="Nhập ghi chú (không bắt buộc)"
              onChange={(event) => updateField("note", event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingCleaningObject || !user?.id}
            >
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <QrScanDialog
        open={isSubjectQrScannerOpen}
        title="Quét QR đối tượng vệ sinh"
        onOpenChange={setIsSubjectQrScannerOpen}
        onScan={handleQrScan}
      />
    </Dialog>
  );
}
