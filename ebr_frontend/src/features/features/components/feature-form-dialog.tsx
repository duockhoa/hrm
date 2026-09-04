"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormEvent, useState } from "react";
import { FEATURE_GROUPS, FEATURE_KINDS } from "../constants";
import type { CreateFeaturePayload, Feature } from "../types";

type FeatureFormState = {
  key: string;
  kind: string;
  label: string;
  group_name: string;
  default_order: string;
};

const emptyForm: FeatureFormState = {
  key: "",
  kind: "section",
  label: "",
  group_name: "none",
  default_order: "0",
};

const createFormFromFeature = (feature: Feature): FeatureFormState => ({
  key: feature.key,
  kind: feature.kind,
  label: feature.label,
  group_name: feature.group_name || "none",
  default_order: String(feature.default_order ?? 0),
});

const normalizeFeatureForm = (
  form: FeatureFormState,
): CreateFeaturePayload => ({
  key: form.key.trim(),
  kind: form.kind,
  label: form.label.trim(),
  group_name: form.group_name === "none" ? null : form.group_name,
  default_order: Number(form.default_order) || 0,
});

type FeatureFormDialogProps = {
  open: boolean;
  feature: Feature | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateFeaturePayload) => void;
};

export default function FeatureFormDialog({
  open,
  feature,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: FeatureFormDialogProps) {
  const [form, setForm] = useState<FeatureFormState>(
    feature ? createFormFromFeature(feature) : emptyForm,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(normalizeFeatureForm(form));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {feature ? "Cập nhật tính năng" : "Thêm tính năng"}
          </DialogTitle>
          <DialogDescription>
            Key dùng để frontend map tới đúng action hoặc view.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="feature-key">
              Key
            </label>
            <Input
              id="feature-key"
              value={form.key}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  key: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loại</label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, kind: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_KINDS.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nhóm tính năng</label>
              <Select
                value={form.group_name}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, group_name: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Không thuộc nhóm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không thuộc nhóm</SelectItem>
                  {FEATURE_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                  {!FEATURE_GROUPS.some(
                    (group) => group.value === form.group_name,
                  ) && form.group_name !== "none" ? (
                    <SelectItem value={form.group_name}>
                      {form.group_name}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="feature-default-order"
              >
                Thứ tự mặc định
              </label>
              <Input
                id="feature-default-order"
                type="number"
                value={form.default_order}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    default_order: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="feature-label">
              Tên hiển thị
            </label>
            <Input
              id="feature-label"
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  );
}
