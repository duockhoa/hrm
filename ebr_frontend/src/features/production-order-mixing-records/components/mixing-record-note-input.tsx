"use client";

import productionOrderMixingRecordsService from "@/services/production-order-mixing-records.service";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProductionOrderMixingRecordParameter } from "../types";

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "Không thể lưu ghi chú.";

export default function MixingRecordNoteInput({
  parameter,
  onSaved,
  disabled = false,
}: {
  parameter: ProductionOrderMixingRecordParameter;
  onSaved: () => void | Promise<unknown>;
  disabled?: boolean;
}) {
  const remoteNote = parameter.note ?? "";
  const [draft, setDraft] = useState(remoteNote);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  const save = async () => {
    const normalized = draft.trim();
    const normalizedRemote = remoteNote.trim();
    if (disabled || isSaving || normalized === normalizedRemote) return;

    setIsSaving(true);
    try {
      await productionOrderMixingRecordsService.updateParameterResult(
        parameter.id,
        { note: normalized || null },
      );
      await onSaved();
    } catch (error) {
      setDraft(remoteNote);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-10 items-stretch">
      <textarea
        ref={textareaRef}
        rows={1}
        value={draft}
        disabled={disabled || isSaving}
        placeholder="Nhập ghi chú"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void save()}
        className="block min-h-10 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2 py-2 font-sans text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-blue-50/50 disabled:cursor-default disabled:opacity-100"
      />
      {isSaving ? (
        <span className="flex shrink-0 items-center px-1">
          <Loader2 className="size-4 animate-spin text-blue-600" />
        </span>
      ) : null}
    </div>
  );
}
