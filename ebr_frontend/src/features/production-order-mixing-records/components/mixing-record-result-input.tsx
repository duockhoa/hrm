"use client";

import productionOrderMixingRecordsService from "@/services/production-order-mixing-records.service";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProductionOrderMixingRecordParameter } from "../types";

const toBoolean = (value: unknown): boolean | null => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }
  return null;
};

const padDateTimePart = (value: number) => String(value).padStart(2, "0");

const toDateTimeDisplayValue = (value: unknown) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return [
    `${padDateTimePart(date.getDate())}/${padDateTimePart(date.getMonth() + 1)}/${date.getFullYear()}`,
    `${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}`,
  ].join(" ");
};

const toDateTimeResultValue = (value: string): string | null | undefined => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  const match = normalizedValue.match(
    /^(?:(\d{4})-(\d{2})-(\d{2})T|(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+)(\d{1,2}):(\d{2})$/,
  );
  if (!match) return undefined;

  const [, isoYear, isoMonth, isoDay, displayDay, displayMonth, displayYear, hours, minutes] = match;
  const year = Number(isoYear ?? displayYear);
  const month = Number(isoMonth ?? displayMonth);
  const day = Number(isoDay ?? displayDay);
  const hour = Number(hours);
  const minute = Number(minutes);
  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return undefined;
  }

  return `${year}-${padDateTimePart(month)}-${padDateTimePart(day)}T${padDateTimePart(hour)}:${padDateTimePart(minute)}`;
};

const toInputValue = (parameter: ProductionOrderMixingRecordParameter) => {
  const value = parameter.result_value;
  if (value === null || value === undefined) return "";
  if (parameter.data_type === "datetime") {
    return toDateTimeDisplayValue(value);
  }
  return String(value);
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "Không thể lưu giá trị thực tế.";

export default function MixingRecordResultInput({
  parameter,
  onSaved,
  disabled = false,
}: {
  parameter: ProductionOrderMixingRecordParameter;
  onSaved: (updated: ProductionOrderMixingRecordParameter) => void | Promise<unknown>;
  disabled?: boolean;
}) {
  const [localDraft, setDraft] = useState<string | undefined>(undefined);
  const [localBooleanDraft, setBooleanDraft] = useState<boolean | null | undefined>(undefined);
  const draft = localDraft ?? toInputValue(parameter);
  const booleanDraft = localBooleanDraft === undefined ? toBoolean(parameter.result_value) : localBooleanDraft;
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const remoteInputValue = toInputValue(parameter);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(resizeTextarea, [draft]);

  const save = async (resultValue: string | number | boolean | null) => {
    if (disabled) return;
    setIsSaving(true);
    try {
      const updated = await productionOrderMixingRecordsService.updateParameterResult(
        parameter.id,
        { result_value: resultValue },
      );
      await onSaved(updated);
      setDraft(undefined);
      setBooleanDraft(undefined);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const saveDraft = async () => {
    const normalized: string | number | null | undefined =
      draft === ""
        ? null
        : parameter.data_type === "number" || parameter.data_type === "decimal"
          ? Number(draft)
          : parameter.data_type === "datetime"
            ? toDateTimeResultValue(draft)
          : draft;
    const normalizedRemote: string | number | null | undefined =
      remoteInputValue === ""
        ? null
        : parameter.data_type === "number" || parameter.data_type === "decimal"
          ? Number(remoteInputValue)
          : parameter.data_type === "datetime"
            ? toDateTimeResultValue(remoteInputValue)
          : remoteInputValue;

    if (disabled || isSaving) return;
    if (normalized === normalizedRemote) {
      setDraft(undefined);
      return;
    }
    if (typeof normalized === "number" && Number.isNaN(normalized)) {
      toast.error("Giá trị thực tế phải là một số hợp lệ.");
      return;
    }
    if (normalized === undefined) {
      toast.error("Ngày giờ phải có định dạng DD/MM/YYYY HH:mm.");
      return;
    }
    await save(normalized);
  };

  const saveBoolean = async (value: boolean) => {
    if (disabled || isSaving) return;
    const nextValue = booleanDraft === value ? null : value;
    setBooleanDraft(nextValue);
    await save(nextValue);
  };

  if (parameter.data_type === "boolean") {
    return (
      <div className="relative flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 px-1 py-1.5 font-sans text-sm text-blue-600">
        <label
          className={`inline-flex items-center gap-1.5 ${
            disabled ? "cursor-default" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            checked={booleanDraft === true}
            disabled={disabled || isSaving}
            onChange={() => void saveBoolean(true)}
            className="size-4 accent-slate-900"
          />
          Đúng
        </label>
        <label
          className={`inline-flex items-center gap-1.5 ${
            disabled ? "cursor-default" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            checked={booleanDraft === false}
            disabled={disabled || isSaving}
            onChange={() => void saveBoolean(false)}
            className="size-4 accent-slate-900"
          />
          Sai
        </label>
        <div className="ml-auto flex items-center gap-2">
          {parameter.unit ? (
            <span className="font-medium text-blue-600">{parameter.unit}</span>
          ) : null}
          {isSaving ? (
            <Loader2 className="size-4 animate-spin text-blue-600" />
          ) : booleanDraft !== null ? (
            <Check className="size-4 text-emerald-600" />
          ) : null}
        </div>
      </div>
    );
  }

  const sharedClassName =
    "min-w-0 flex-1 border-0 bg-transparent px-2 py-2 font-sans text-sm text-blue-600 outline-none placeholder:text-slate-400 focus:bg-blue-50/50 disabled:cursor-default disabled:opacity-100";

  return (
    <div className="flex min-h-10 items-stretch">
      {parameter.data_type === "text" ||
      parameter.data_type === "select" ||
      parameter.data_type === "datetime" ? (
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          disabled={disabled || isSaving}
          placeholder={
            parameter.data_type === "datetime"
              ? "DD/MM/YYYY HH:mm"
              : "Nhập kết quả"
          }
          aria-label={
            parameter.data_type === "datetime"
              ? "Ngày giờ thực tế, định dạng DD/MM/YYYY HH:mm"
              : undefined
          }
          inputMode={parameter.data_type === "datetime" ? "numeric" : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            void saveDraft();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className={`${sharedClassName} block min-h-10 resize-none overflow-hidden break-words`}
        />
      ) : (
        <input
          type={
            parameter.data_type === "date"
              ? "date"
              : "number"
          }
          step={parameter.data_type === "number" ? "1" : "any"}
          value={draft}
          disabled={disabled || isSaving}
          placeholder="Nhập kết quả"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            void saveDraft();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={`${sharedClassName} min-h-10`}
        />
      )}
      {isSaving ? (
        <span className="flex shrink-0 items-center px-1">
          <Loader2 className="size-4 animate-spin text-blue-600" />
        </span>
      ) : null}
      {parameter.unit ? (
        <span className="flex max-w-20 shrink-0 items-center break-words bg-transparent px-2 py-1 font-sans text-xs font-medium text-blue-600">
          {parameter.unit}
        </span>
      ) : null}
    </div>
  );
}
