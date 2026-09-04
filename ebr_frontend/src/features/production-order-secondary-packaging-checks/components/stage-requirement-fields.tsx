"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { API_ROUTES } from "@/lib/api-routes";
import { secondaryPackagingStageRequirementsService } from "@/services/index.service";
import type { SecondaryPackagingStageRequirement } from "@/features/secondary-packaging-stage-requirements";

export default function StageRequirementFields({
  stage,
  requirement,
  disabled,
  onChange,
}: {
  stage: string;
  requirement: string;
  disabled?: boolean;
  onChange: (stage: string, requirement: string) => void;
}) {
  const { data = [], isLoading, error } = useSWR<
    SecondaryPackagingStageRequirement[]
  >(
    API_ROUTES.secondaryPackagingStageRequirements.base,
    secondaryPackagingStageRequirementsService.fetchAll,
  );

  const options = useMemo(() => {
    const requirementsByStage = new Map<string, string>();
    data.forEach((item) => {
      if (!requirementsByStage.has(item.stage)) {
        requirementsByStage.set(item.stage, item.requirement);
      }
    });

    if (stage && !requirementsByStage.has(stage)) {
      requirementsByStage.set(stage, requirement);
    }

    return Array.from(requirementsByStage, ([value, stageRequirement]) => ({
      value,
      requirement: stageRequirement,
    })).sort((first, second) =>
      first.value.localeCompare(second.value, "vi-VN"),
    );
  }, [data, requirement, stage]);

  return (
    <>
      <Select
        value={stage}
        disabled={disabled || isLoading}
        onValueChange={(value) => {
          const selected = options.find((option) => option.value === value);
          onChange(value, selected?.requirement ?? "");
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              isLoading ? "Đang tải danh sách công đoạn..." : "Chọn công đoạn"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-sm text-destructive">
          Không thể tải danh mục công đoạn đóng gói bao bì cấp 2.
        </p>
      ) : null}
      {!isLoading && !error && options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có công đoạn. Vui lòng khai báo trong phần Cài đặt.
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <Label>Yêu cầu</Label>
        <Textarea
          value={requirement}
          rows={4}
          readOnly
          disabled={disabled}
          className="bg-muted/40"
          placeholder="Yêu cầu sẽ tự động hiển thị theo công đoạn"
        />
      </div>
    </>
  );
}
