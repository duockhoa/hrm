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
  action_ids: number[];
  key: string;
  kind: string;
  label: string;
  group_name: string;
  default_order: string;
};

const emptyForm: FeatureFormState = {
  action_ids: [],
  key: "",
  kind: "section",
  label: "",
  group_name: "none",
  default_order: "0",
};

const createFormFromFeature = (feature: Feature): FeatureFormState => ({
  action_ids: (feature.source_actions ?? []).map((action) => action.id),
  key: feature.key,
  kind: feature.kind,
  label: feature.label,
  group_name: feature.group_name || "none",
  default_order: String(feature.default_order ?? 0),
});

const normalizeFeatureForm = (
  form: FeatureFormState,
): CreateFeaturePayload => ({
  action_ids: form.kind === "section" ? form.action_ids : [],
  key: form.key.trim(),
  kind: form.kind,
  label: form.label.trim(),
  group_name: form.group_name === "none" ? null : form.group_name,
  default_order: Number(form.default_order) || 0,
});

type FeatureFormDialogProps = {
  features: Feature[];
  open: boolean;
  feature: Feature | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateFeaturePayload) => void;
};

export default function FeatureFormDialog({
  features,
  open,
  feature,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: FeatureFormDialogProps) {
  const [form, setForm] = useState<FeatureFormState>(
    feature ? createFormFromFeature(feature) : emptyForm,
  );
  const [actionSearch, setActionSearch] = useState("");
  const availableActions = features.filter((entry) => entry.kind === "action");
  const getOtherSection = (action: Feature) =>
    action.target_sections?.find((section) => section.id !== feature?.id);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(normalizeFeatureForm(form));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {feature ? "Cập nhật tính năng" : "Thêm tính năng"}
          </DialogTitle>
          <DialogDescription>
            Key dùng để frontend map tới đúng action hoặc view.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {form.kind === "section" && (
            <fieldset className="space-y-2 rounded border p-3">
              <legend className="px-1 text-sm font-medium">
                Action cung cấp dữ liệu
              </legend>
              <Input
                placeholder="Tìm action theo tên hoặc key"
                value={actionSearch}
                onChange={(event) => setActionSearch(event.target.value)}
              />
              <div className="max-h-44 space-y-2 overflow-y-auto">
                {availableActions
                  .filter((action) =>
                    `${action.label} ${action.key}`
                      .toLowerCase()
                      .includes(actionSearch.trim().toLowerCase()),
                  )
                  .map((action) => {
                    const otherSection = getOtherSection(action);
                    return (
                      <label
                        key={action.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.action_ids.includes(action.id)}
                          disabled={
                            Boolean(otherSection) &&
                            !form.action_ids.includes(action.id)
                          }
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              action_ids: event.target.checked
                                ? [...current.action_ids, action.id]
                                : current.action_ids.filter(
                                    (id) => id !== action.id,
                                  ),
                            }))
                          }
                        />
                        <span>
                          {action.label}
                          <span className="block text-xs text-gray-500">
                            {action.key}
                          </span>
                          {otherSection && (
                            <span className="block text-xs text-amber-700">
                              Đã thuộc section: {otherSection.label}. Gỡ liên
                              kết tại section đó trước khi chuyển.
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                {availableActions.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Chưa có action trong danh mục.
                  </p>
                )}
              </div>
              {form.action_ids.length > 0 && (
                <ol className="space-y-1 border-t pt-2 text-sm">
                  {form.action_ids.map((id, index) => (
                    <li key={id} className="flex items-center gap-2">
                      <span className="flex-1">
                        {index + 1}.{" "}
                        {availableActions.find((action) => action.id === id)
                          ?.label ?? `Action #${id}`}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        aria-label={`Đưa action ${id} lên trước`}
                        onClick={() =>
                          setForm((current) => {
                            const ids = [...current.action_ids];
                            [ids[index - 1], ids[index]] = [
                              ids[index],
                              ids[index - 1],
                            ];
                            return { ...current, action_ids: ids };
                          })
                        }
                      >
                        Lên
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            action_ids: current.action_ids.filter(
                              (entry) => entry !== id,
                            ),
                          }))
                        }
                      >
                        Gỡ
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </fieldset>
          )}
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
