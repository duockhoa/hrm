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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { API_ROUTES } from "@/lib/api-routes";
import {
  mixingActivityTemplateStagesService,
  mixingActivityTemplateStageStepParametersService,
  mixingActivityTemplateStageStepsService,
} from "@/services/index.service";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit2,
  EllipsisVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Fragment, type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  MixingActivityTemplateStage,
  UpdateMixingActivityTemplateStagePayload,
} from "../types";
import {
  compactUniqueOrdersAfterDelete,
  swapUniqueOrders,
} from "../swap-unique-orders";
import MixingActivityTemplateStageSteps from "./mixing-activity-template-stage-steps";

type StageFormState = {
  stageName: string;
  stageOrder: string;
};

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function MixingActivityTemplateStages({
  templateId,
}: {
  templateId: number;
}) {
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingStage, setEditingStage] =
    useState<MixingActivityTemplateStage | null>(null);
  const [insertAtOrder, setInsertAtOrder] = useState<number | null>(null);
  const [stepCreateRequest, setStepCreateRequest] = useState<{
    stageId: number | null;
    requestId: number;
  }>({ stageId: null, requestId: 0 });
  const [deletingStage, setDeletingStage] =
    useState<MixingActivityTemplateStage | null>(null);
  const [form, setForm] = useState<StageFormState>({
    stageName: "",
    stageOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stagesRoute = API_ROUTES.items.mixingActivityTemplateStages(templateId);
  const { data = [], error, isLoading, mutate } = useSWR(stagesRoute, () =>
    mixingActivityTemplateStagesService.fetchByTemplateId(templateId),
  );

  const stages = useMemo(
    () => [...data].sort((first, second) => first.stage_order - second.stage_order),
    [data],
  );

  const closeForm = () => {
    setIsEditingRow(false);
    setEditingStage(null);
    setInsertAtOrder(null);
  };

  const openCreateForm = (requestedOrder?: number) => {
    const nextOrder =
      requestedOrder ??
      stages.reduce(
        (highestOrder, stage) => Math.max(highestOrder, stage.stage_order),
        0,
      ) + 1;
    setEditingStage(null);
    setInsertAtOrder(nextOrder);
    setForm({ stageName: "", stageOrder: String(nextOrder) });
    setIsEditingRow(true);
  };

  const openEditForm = (stage: MixingActivityTemplateStage) => {
    setEditingStage(stage);
    setInsertAtOrder(null);
    setForm({
      stageName: stage.stage_name,
      stageOrder: String(stage.stage_order),
    });
    setIsEditingRow(true);
  };

  const requestStepCreation = (stageId: number) => {
    setStepCreateRequest((current) => ({
      stageId,
      requestId: current.requestId + 1,
    }));
  };

  const validateForm = () => {
    const stageName = form.stageName.trim();
    const stageOrder = Number(form.stageOrder);

    if (!stageName) {
      toast.error("Vui lòng nhập tên giai đoạn.");
      return false;
    }
    if (stageName.length > 255) {
      toast.error("Tên giai đoạn tối đa 255 ký tự.");
      return false;
    }
    if (!Number.isInteger(stageOrder) || stageOrder <= 0) {
      toast.error("Thứ tự giai đoạn phải là số nguyên dương.");
      return false;
    }
    if (
      editingStage &&
      stages.some(
        (stage) =>
          stage.id !== editingStage?.id && stage.stage_order === stageOrder,
      )
    ) {
      toast.error("Thứ tự này đã được sử dụng trong biểu mẫu.");
      return false;
    }
    return true;
  };

  const rollbackShiftedStages = async (
    shiftedStages: MixingActivityTemplateStage[],
  ) => {
    const stagesInOriginalOrder = [...shiftedStages].sort(
      (first, second) => first.stage_order - second.stage_order,
    );

    for (const stage of stagesInOriginalOrder) {
      try {
        await mixingActivityTemplateStagesService.update(stage.id, {
          stage_order: stage.stage_order,
        });
      } catch (rollbackError) {
        void rollbackError;
      }
    }
  };

  const shiftStagesForInsert = async (stageOrder: number) => {
    const stagesToShift = stages
      .filter((stage) => stage.stage_order >= stageOrder)
      .sort((first, second) => second.stage_order - first.stage_order);
    const shiftedStages: MixingActivityTemplateStage[] = [];

    try {
      for (const stage of stagesToShift) {
        await mixingActivityTemplateStagesService.update(stage.id, {
          stage_order: stage.stage_order + 1,
        });
        shiftedStages.push(stage);
      }
      return shiftedStages;
    } catch (shiftError) {
      await rollbackShiftedStages(shiftedStages);
      throw shiftError;
    }
  };

  const moveStage = async (
    stage: MixingActivityTemplateStage,
    direction: "up" | "down",
  ) => {
    const currentIndex = stages.findIndex((item) => item.id === stage.id);
    const adjacentIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const adjacentStage = stages[adjacentIndex];
    if (!adjacentStage) return;

    const temporaryOrder =
      stages.reduce(
        (highestOrder, item) => Math.max(highestOrder, item.stage_order),
        0,
      ) + 1;

    setIsSubmitting(true);
    try {
      await swapUniqueOrders({
        itemId: stage.id,
        itemOrder: stage.stage_order,
        adjacentId: adjacentStage.id,
        adjacentOrder: adjacentStage.stage_order,
        temporaryOrder,
        updateOrder: (id, order) =>
          mixingActivityTemplateStagesService.update(id, {
            stage_order: order,
          }),
      });
      toast.success(
        direction === "up"
          ? "Đã di chuyển giai đoạn lên trên."
          : "Đã di chuyển giai đoạn xuống dưới.",
      );
      await mutate();
    } catch (moveError) {
      await mutate();
      toast.error(getErrorMessage(moveError, "Không thể thay đổi thứ tự giai đoạn."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicateStage = async (stage: MixingActivityTemplateStage) => {
    const duplicateOrder = stage.stage_order + 1;
    let shiftedStages: MixingActivityTemplateStage[] = [];
    let duplicatedStage: MixingActivityTemplateStage | null = null;
    let cleanupFailed = false;

    setIsSubmitting(true);
    try {
      const sourceSteps = (
        await mixingActivityTemplateStageStepsService.fetchByStageId(stage.id)
      ).sort((first, second) => first.step_order - second.step_order);
      const sourceStructure = await Promise.all(
        sourceSteps.map(async (sourceStep) => ({
          step: sourceStep,
          parameters: (
            await mixingActivityTemplateStageStepParametersService.fetchByStepId(
              sourceStep.id,
            )
          ).sort(
            (first, second) => first.parameter_order - second.parameter_order,
          ),
        })),
      );

      shiftedStages = await shiftStagesForInsert(duplicateOrder);

      try {
        duplicatedStage = await mixingActivityTemplateStagesService.create(
          templateId,
          {
            stage_name: stage.stage_name,
            stage_order: duplicateOrder,
          },
        );

        for (const { step, parameters } of sourceStructure) {
          const duplicatedStep =
            await mixingActivityTemplateStageStepsService.create(
              duplicatedStage.id,
              {
                step_name: step.step_name,
                step_order: step.step_order,
              },
            );

          for (const parameter of parameters) {
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
        }
      } catch (cloneError) {
        if (duplicatedStage) {
          try {
            await mixingActivityTemplateStagesService.delete(duplicatedStage.id);
            duplicatedStage = null;
          } catch (cleanupError) {
            cleanupFailed = true;
            void cleanupError;
          }
        }
        throw cloneError;
      }

      toast.success("Đã nhân bản giai đoạn xuống ngay phía dưới.");
      await mutate();
    } catch (duplicateError) {
      if (!cleanupFailed && shiftedStages.length > 0) {
        await rollbackShiftedStages(shiftedStages);
      }
      await mutate();
      toast.error(
        cleanupFailed
          ? "Không thể hoàn tất nhân bản và không thể tự động dọn dữ liệu đã tạo. Vui lòng tải lại để kiểm tra."
          : getErrorMessage(duplicateError, "Không thể nhân bản giai đoạn pha chế."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const nextValues = {
      stage_name: form.stageName.trim(),
      stage_order: Number(form.stageOrder),
    };

    setIsSubmitting(true);
    try {
      if (editingStage) {
        const payload: UpdateMixingActivityTemplateStagePayload = {};
        if (nextValues.stage_name !== editingStage.stage_name) {
          payload.stage_name = nextValues.stage_name;
        }
        if (nextValues.stage_order !== editingStage.stage_order) {
          payload.stage_order = nextValues.stage_order;
        }
        if (Object.keys(payload).length > 0) {
          await mixingActivityTemplateStagesService.update(editingStage.id, payload);
          toast.success("Đã cập nhật giai đoạn pha chế.");
        }
      } else {
        const shiftedStages = await shiftStagesForInsert(nextValues.stage_order);
        try {
          await mixingActivityTemplateStagesService.create(templateId, nextValues);
        } catch (createError) {
          await rollbackShiftedStages(shiftedStages);
          throw createError;
        }
        toast.success("Đã thêm giai đoạn pha chế.");
      }

      closeForm();
      await mutate();
    } catch (submitError) {
      await mutate();
      toast.error(
        getErrorMessage(
          submitError,
          editingStage
            ? "Không thể cập nhật giai đoạn pha chế."
            : "Không thể thêm giai đoạn pha chế.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStage) return;

    let wasDeleted = false;
    setIsSubmitting(true);
    try {
      await mixingActivityTemplateStagesService.delete(deletingStage.id);
      wasDeleted = true;
      setDeletingStage(null);
      await compactUniqueOrdersAfterDelete({
        deletedItemId: deletingStage.id,
        orderedItems: stages.map((stage) => ({
          id: stage.id,
          order: stage.stage_order,
        })),
        updateOrder: (id, order) =>
          mixingActivityTemplateStagesService.update(id, {
            stage_order: order,
          }),
      });
      toast.success("Đã xóa giai đoạn pha chế.");
      await mutate();
    } catch (deleteError) {
      if (wasDeleted) {
        await mutate().catch(() => undefined);
        toast.error("Đã xóa giai đoạn, nhưng không thể cập nhật lại thứ tự.");
        return;
      }
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa giai đoạn pha chế."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditorRow = (key: string | number) => (
    <tr key={key}>
      <td
        colSpan={4}
        className="h-11 border border-black bg-blue-50/40 px-2 py-1 align-middle"
      >
        <form
          className="flex items-center gap-2"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isSubmitting) {
              event.preventDefault();
              closeForm();
            }
          }}
        >
          <span className="shrink-0 font-medium">Giai đoạn</span>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.stageOrder}
            disabled={isSubmitting}
            readOnly={!editingStage}
            className="h-8 w-16 shrink-0 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px] read-only:bg-gray-100"
            aria-label="Thứ tự giai đoạn"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stageOrder: event.target.value,
              }))
            }
          />
          <span className="shrink-0 font-medium">:</span>
          <Input
            value={form.stageName}
            maxLength={255}
            disabled={isSubmitting}
            placeholder="Nhập tên giai đoạn"
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-sm border-black bg-white px-2 font-serif text-[15px]"
            aria-label="Tên giai đoạn"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stageName: event.target.value,
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
            onClick={closeForm}
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
      <div className="relative mt-6 pb-3">
        <table
          className="w-full table-fixed border-collapse border border-black"
          aria-label="Các giai đoạn theo dõi quá trình pha chế"
        >
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[35%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Nội dung kiểm tra
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Yêu cầu
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Thực tế
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Người
                <br />
                thực hiện
              </th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td
                  colSpan={4}
                  className="h-10 border border-black px-2 py-1 text-center text-sm text-red-700"
                >
                  {getErrorMessage(error, "Không thể tải danh sách giai đoạn.")}
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="h-10 animate-pulse border border-black bg-gray-50 px-2 py-1 text-center text-sm text-gray-500"
                >
                  Đang tải các giai đoạn...
                </td>
              </tr>
            ) : (
              <>
                {stages.map((stage, index) => (
                  <Fragment key={stage.id}>
                    {isEditingRow &&
                    !editingStage &&
                    insertAtOrder === stage.stage_order
                      ? renderEditorRow(`new-stage-${insertAtOrder}`)
                      : null}
                    {isEditingRow && editingStage?.id === stage.id ? (
                      renderEditorRow(stage.id)
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="relative h-8 border border-black px-2 py-0.5 align-middle"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 break-words font-medium">
                              Giai đoạn {stage.stage_order}: {stage.stage_name}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-7 w-7 shrink-0"
                                  disabled={isEditingRow || isSubmitting}
                                  aria-label={`Thao tác giai đoạn ${stage.stage_order}`}
                                >
                                  <EllipsisVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="font-sans"
                              >
                                <DropdownMenuItem
                                  onSelect={() => requestStepCreation(stage.id)}
                                >
                                  <Plus className="size-4" />
                                  Thêm bước
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => void duplicateStage(stage)}
                                >
                                  <Copy className="size-4" />
                                  Nhân bản
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={index === 0}
                                  onSelect={() => moveStage(stage, "up")}
                                >
                                  <ArrowUp className="size-4" />
                                  Di chuyển lên trên
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={index === stages.length - 1}
                                  onSelect={() => moveStage(stage, "down")}
                                >
                                  <ArrowDown className="size-4" />
                                  Di chuyển xuống dưới
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => openEditForm(stage)}
                                >
                                  <Edit2 className="size-4" />
                                  Sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setDeletingStage(stage)}
                                >
                                  <Trash2 className="size-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )}
                    <MixingActivityTemplateStageSteps
                      stageId={stage.id}
                      createRequestId={
                        stepCreateRequest.stageId === stage.id
                          ? stepCreateRequest.requestId
                          : 0
                      }
                    />
                    {index < stages.length - 1 ? (
                      <tr className="h-0">
                        <td
                          colSpan={4}
                          className="relative h-0 border-0 p-0"
                        >
                          <button
                            type="button"
                            className="absolute -top-3 -left-3 z-20 flex size-6 items-center justify-center rounded-full border border-blue-500 bg-white text-blue-600 opacity-20 shadow-sm transition-[background-color,color,opacity,box-shadow] hover:bg-blue-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-10"
                            onClick={() =>
                              openCreateForm(stages[index + 1].stage_order)
                            }
                            disabled={isEditingRow || isSubmitting}
                            title={`Thêm giai đoạn trước giai đoạn ${stages[index + 1].stage_order}`}
                            aria-label={`Thêm giai đoạn trước giai đoạn ${stages[index + 1].stage_order}`}
                          >
                            <Plus className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {isEditingRow &&
                !editingStage &&
                !stages.some((stage) => stage.stage_order === insertAtOrder)
                  ? renderEditorRow(`new-stage-${insertAtOrder}`)
                  : null}
                {stages.length === 0 && !isEditingRow ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-10 border border-black px-2 py-1 text-center text-sm italic text-gray-500"
                    >
                      Chưa có giai đoạn pha chế
                    </td>
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>

        <button
          type="button"
          className="absolute bottom-0 -left-3 z-10 flex size-6 items-center justify-center rounded-full border border-blue-500 bg-white text-blue-600 opacity-20 shadow-sm transition-[background-color,color,opacity,box-shadow] hover:bg-blue-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-10"
          onClick={() => openCreateForm()}
          disabled={isLoading || isSubmitting || isEditingRow}
          title="Thêm giai đoạn pha chế"
          aria-label="Thêm giai đoạn pha chế"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <Dialog
        open={Boolean(deletingStage)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingStage(null);
        }}
      >
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Xóa giai đoạn pha chế</DialogTitle>
            <DialogDescription>
              Giai đoạn này sẽ bị xóa khỏi biểu mẫu và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <p className="font-medium">
              Giai đoạn {deletingStage?.stage_order}: {deletingStage?.stage_name}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingStage(null)}
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
