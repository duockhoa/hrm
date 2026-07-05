"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddRoleFormProps = {
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  onClose?: () => void;
};

export default function AddRoleForm({ onSubmit, onClose }: AddRoleFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description });
      setName("");
      setDescription("");
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
            Lưu
          </Button>
          <Button
            type="button"
            variant="outline"
            className="ml-2"
            onClick={() => {
              setName("");
              setDescription("");
            }}
            disabled={isSubmitting}
          >
            Đặt lại
          </Button>
        </div>
      </form>
    </div>
  );
}
