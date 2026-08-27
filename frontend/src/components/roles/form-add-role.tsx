"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddRoleFormProps = {
  onSubmit: (data: {
    name: string;
    description: string;
  }) => Promise<boolean | void>;
  onClose?: () => void;
  initialData?: {
    name: string;
    description?: string | null;
  };
  submitLabel?: string;
};

export default function AddRoleForm({
  onSubmit,
  onClose,
  initialData,
  submitLabel = "Lưu",
}: AddRoleFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const shouldClose = await onSubmit({ name, description });
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
            Tên vai trò
          </label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nhập tên vai trò"
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Mô tả
          </label>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Nhập mô tả vai trò"
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
