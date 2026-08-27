"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddApplicationFormData = {
  key: string;
  name: string;
  description: string;
  default_order: string;
};

type AddApplicationFormProps = {
  onSubmit: (data: AddApplicationFormData) => Promise<boolean | void>;
  onClose?: () => void;
  initialData?: Partial<AddApplicationFormData>;
  submitLabel?: string;
};

const initialFormData: AddApplicationFormData = {
  key: "",
  name: "",
  description: "",
  default_order: "0",
};

export default function AddApplicationForm({
  onSubmit,
  onClose,
  initialData,
  submitLabel = "Lưu",
}: AddApplicationFormProps) {
  const getInitialFormData = (): AddApplicationFormData => ({
    ...initialFormData,
    ...initialData,
  });
  const [formData, setFormData] =
    useState<AddApplicationFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof AddApplicationFormData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const shouldClose = await onSubmit(formData);
      if (shouldClose === false) {
        return;
      }
      resetForm();
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Key ứng dụng
          </label>
          <Input
            value={formData.key}
            onChange={(event) => updateField("key", event.target.value)}
            placeholder="Ví dụ: hrm"
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tên ứng dụng
          </label>
          <Input
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Nhập tên ứng dụng"
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Thứ tự
          </label>
          <Input
            value={formData.default_order}
            onChange={(event) =>
              updateField("default_order", event.target.value)
            }
            placeholder="0"
            inputMode="numeric"
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Mô tả
          </label>
          <Input
            value={formData.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Nhập mô tả ứng dụng"
            disabled={isSubmitting}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="ml-2"
            onClick={resetForm}
            disabled={isSubmitting}
          >
            Đặt lại
          </Button>
        </div>
      </form>
    </div>
  );
}
