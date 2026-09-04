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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import {
  mixingActivityTemplateStageStepParametersService,
  mixingActivityTemplateStageStepsService,
} from "@/services/index.service";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  MixingActivityTemplateStageStep,
  UpdateMixingActivityTemplateStageStepPayload,
} from "../types";
import {
  compactUniqueOrdersAfterDelete,
  swapUniqueOrders,
} from "../swap-unique-orders";
import MixingActivityTemplateStageStepBlock from "./mixing-activity-template-stage-step-block";

type StepFormState = {
  stepName: string;
  stepOrder: string;
};

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function MixingActivityTemplateStageSteps({
  stageId,
  createRequestId,
}: {
  stageId: number;
  createRequestId: number;
}) {
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingStep, setEditingStep] =
    useState<MixingActivityTemplateStageStep | null>(null);
  const [deletingStep, setDeletingStep] =
    useState<MixingActivityTemplateStageStep | null>(null);
  const [form, setForm] = useState<StepFormState>({
    stepName: "",
    stepOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledCreateRequestId = useRef(0);

  const stepsRoute = API_ROUTES.items.mixingActivityTemplateStageSteps(stageId);
  const { data = [], error, isLoading, mutate } = useSWR(stepsRoute, () =>
    mixingActivityTemplateStageStepsService.fetchByStageId(stageId),
  );

  const steps = useMemo(
    () => [...data].sort((first, second) => first.step_order - second.step_order),
    [data],
  );

  useEffect(() => {
    if (
      !createRequestId ||
      isLoading ||
      handledCreateRequestId.current === createRequestId
    ) {
      return;
    }

    const nextOrder =
      steps.reduce(
        (highestOrder, step) => Math.max(highestOrder, step.step_order),
        0,
      ) + 1;
    handledCreateRequestId.current = createRequestId;
    setEditingStep(null);
    setForm({ stepName: "", stepOrder: String(nextOrder) });
    setIsEditingRow(true);
  }, [createRequestId, isLoading, steps]);

  const closeEditor = () => {
    setIsEditingRow(false);
    setEditingStep(null);
  };

  const openEditForm = (step: MixingActivityTemplateStageStep) => {
    setEditingStep(step);
    setForm({
      stepName: step.step_name,
      stepOrder: String(step.step_order),
    });
    setIsEditingRow(true);
  };

  const validateForm = () => {
    const stepName = form.stepName.trim();
    const stepOrder = Number(form.stepOrder);

    if (!stepName) {
      toast.error("Vui lòng nhập tên bước.");
      return false;
    }
    if (stepName.length > 255) {
      toast.error("Tên bước tối đa 255 ký tự.");
      return false;
    }
    if (!Number.isInteger(stepOrder) || stepOrder <= 0) {
      toast.error("Thứ tự bước phải là số nguyên dương.");
      return false;
    }
    if (
      steps.some(
        (step) =>
          step.id !== editingStep?.id && step.step_order === stepOrder,
      )
    ) {
      toast.error("Thứ tự này đã được sử dụng trong giai đoạn.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const nextValues = {
      step_name: form.stepName.trim(),
      step_order: Number(form.stepOrder),
    };

    setIsSubmitting(true);
    try {
      if (editingStep) {
        const payload: UpdateMixingActivityTemplateStageStepPayload = {};
        if (nextValues.step_name !== editingStep.step_name) {
          payload.step_name = nextValues.step_name;
        }
        if (nextValues.step_order !== editingStep.step_order) {
          payload.step_order = nextValues.step_order;
        }
        if (Object.keys(payload).length > 0) {
          await mixingActivityTemplateStageStepsService.update(
            editingStep.id,
            payload,
          );
          toast.success("Đã cập nhật bước pha chế.");
        }
      } else {
        await mixingActivityTemplateStageStepsService.create(stageId, nextValues);
        toast.success("Đã thêm bước pha chế.");
      }

      closeEditor();
      await mutate();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingStep
            ? "Không thể cập nhật bước pha chế."
            : "Không thể thêm bước pha chế.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStep) return;

    let wasDeleted = false;
    setIsSubmitting(true);
    try {
      await mixingActivityTemplateStageStepsService.delete(deletingStep.id);
      wasDeleted = true;
      setDeletingStep(null);
      await compactUniqueOrdersAfterDelete({
        deletedItemId: deletingStep.id,
        orderedItems: steps.map((step) => ({
          id: step.id,
          order: step.step_order,
        })),
        updateOrder: (id, order) =>
          mixingActivityTemplateStageStepsService.update(id, {
            step_order: order,
          }),
      });
      toast.success("Đã xóa bước pha chế.");
      await mutate();
    } catch (deleteError) {
      if (wasDeleted) {
        await mutate().catch(() => undefined);
        toast.error("Đã xóa bước, nhưng không thể cập nhật lại thứ tự.");
        return;
      }
      toast.error(getErrorMessage(deleteError, "Không thể xóa bước pha chế."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveStep = async (
    step: MixingActivityTemplateStageStep,
    direction: "up" | "down",
  ) => {
    const currentIndex = steps.findIndex((item) => item.id === step.id);
    const adjacentIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const adjacentStep = steps[adjacentIndex];
    if (!adjacentStep) return;

    const temporaryOrder =
      steps.reduce(
        (highestOrder, item) => Math.max(highestOrder, item.step_order),
        0,
      ) + 1;

    setIsSubmitting(true);
    try {
      await swapUniqueOrders({
        itemId: step.id,
        itemOrder: step.step_order,
        adjacentId: adjacentStep.id,
        adjacentOrder: adjacentStep.step_order,
        temporaryOrder,
        updateOrder: (id, order) =>
          mixingActivityTemplateStageStepsService.update(id, {
            step_order: order,
          }),
      });
      toast.success(
        direction === "up"
          ? "Đã di chuyển bước lên trên."
          : "Đã di chuyển bước xuống dưới.",
      );
      await mutate();
    } catch (moveError) {
      await mutate();
      toast.error(getErrorMessage(moveError, "Không thể thay đổi thứ tự bước."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rollbackShiftedSteps = async (
    shiftedSteps: MixingActivityTemplateStageStep[],
  ) => {
    for (const shiftedStep of [...shiftedSteps].sort(
      (first, second) => first.step_order - second.step_order,
    )) {
      try {
        await mixingActivityTemplateStageStepsService.update(shiftedStep.id, {
          step_order: shiftedStep.step_order,
        });
      } catch (rollbackError) {
        void rollbackError;
      }
    }
  };

  const shiftStepsForInsert = async (stepOrder: number) => {
    const stepsToShift = steps
      .filter((item) => item.step_order >= stepOrder)
      .sort((first, second) => second.step_order - first.step_order);
    const shiftedSteps: MixingActivityTemplateStageStep[] = [];

    try {
      for (const stepToShift of stepsToShift) {
        await mixingActivityTemplateStageStepsService.update(stepToShift.id, {
          step_order: stepToShift.step_order + 1,
        });
        shiftedSteps.push(stepToShift);
      }
      return shiftedSteps;
    } catch (shiftError) {
      await rollbackShiftedSteps(shiftedSteps);
      throw shiftError;
    }
  };

  const duplicateStep = async (step: MixingActivityTemplateStageStep) => {
    const duplicateOrder = step.step_order + 1;
    let shiftedSteps: MixingActivityTemplateStageStep[] = [];
    let duplicatedStep: MixingActivityTemplateStageStep | null = null;
    let cleanupFailed = false;

    setIsSubmitting(true);
    try {
      const sourceParameters = (
        await mixingActivityTemplateStageStepParametersService.fetchByStepId(
          step.id,
        )
      ).sort(
        (first, second) => first.parameter_order - second.parameter_order,
      );

      shiftedSteps = await shiftStepsForInsert(duplicateOrder);

      try {
        duplicatedStep = await mixingActivityTemplateStageStepsService.create(
          stageId,
          {
            step_name: step.step_name,
            step_order: duplicateOrder,
          },
        );

        for (const parameter of sourceParameters) {
          await mixingActivityTemplateStageStepParametersService.create(
            duplicatedStep.id,
            {
              parameter_name: parameter.parameter_name,
              data_type: parameter.data_type,
              unit: parameter.unit ?? null,
              requirement: parameter.requirement,
              parameter_order: parameter.parameter_order,
            },
          );
        }
      } catch (cloneError) {
        if (duplicatedStep) {
          try {
            await mixingActivityTemplateStageStepsService.delete(
              duplicatedStep.id,
            );
            duplicatedStep = null;
          } catch (cleanupError) {
            cleanupFailed = true;
            void cleanupError;
          }
        }
        throw cloneError;
      }

      toast.success("Đã nhân bản bước xuống ngay phía dưới.");
      await mutate();
    } catch (duplicateError) {
      if (!cleanupFailed && shiftedSteps.length > 0) {
        await rollbackShiftedSteps(shiftedSteps);
      }
      await mutate();
      toast.error(
        cleanupFailed
          ? "Không thể hoàn tất nhân bản bước và không thể tự động dọn dữ liệu đã tạo. Vui lòng tải lại để kiểm tra."
          : getErrorMessage(duplicateError, "Không thể nhân bản bước pha chế."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditorRow = (key: string | number) => (
    <tr key={key}>
      <td
        colSpan={4}
        className="h-11 border border-black bg-amber-50/50 px-2 py-1 align-middle"
      >
        <form
          className="flex items-start gap-2"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isSubmitting) {
              event.preventDefault();
              closeEditor();
            }
          }}
        >
          <span className="shrink-0 font-medium">Bước</span>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.stepOrder}
            disabled={isSubmitting}
            className="h-8 w-16 shrink-0 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px]"
            aria-label="Thứ tự bước"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stepOrder: event.target.value,
              }))
            }
          />
          <span className="shrink-0 font-medium">:</span>
          <Textarea
            value={form.stepName}
            maxLength={255}
            disabled={isSubmitting}
            placeholder="Nhập tên bước"
            autoFocus
            rows={1}
            className="min-h-8 min-w-0 flex-1 resize-none overflow-hidden rounded-sm border-black bg-white px-2 py-1 font-serif text-[15px] leading-6"
            aria-label="Tên bước"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stepName: event.target.value,
              }))
            }
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 shrink-0 font-sans"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 font-sans"
            onClick={closeEditor}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
        </form>
      </td>
    </tr>
  );

  return (
    <>
      {error ? (
        <tr>
          <td
            colSpan={4}
            className="h-9 border border-black px-2 py-1 text-center text-sm text-red-700"
          >
            {getErrorMessage(error, "Không thể tải danh sách bước.")}
          </td>
        </tr>
      ) : isLoading ? (
        <tr>
          <td
            colSpan={4}
            className="h-9 animate-pulse border border-black bg-gray-50 px-2 py-1 text-center text-sm text-gray-500"
          >
            Đang tải các bước...
          </td>
        </tr>
      ) : (
        <>
          {steps.map((step, index) =>
            isEditingRow && editingStep?.id === step.id ? (
              renderEditorRow(step.id)
            ) : (
              <MixingActivityTemplateStageStepBlock
                key={step.id}
                step={step}
                disabled={isEditingRow || isSubmitting}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
                onEditStep={() => openEditForm(step)}
                onDeleteStep={() => setDeletingStep(step)}
                onDuplicateStep={() => void duplicateStep(step)}
                onMoveStepUp={() => moveStep(step, "up")}
                onMoveStepDown={() => moveStep(step, "down")}
              />
            ),
          )}
          {isEditingRow && !editingStep
            ? renderEditorRow(`new-step-${stageId}`)
            : null}
        </>
      )}

      <Dialog
        open={Boolean(deletingStep)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingStep(null);
        }}
      >
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Xóa bước pha chế</DialogTitle>
            <DialogDescription>
              Bước này sẽ bị xóa khỏi giai đoạn và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <p className="font-medium">
              Bước {deletingStep?.step_order}: {deletingStep?.step_name}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingStep(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
