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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cleaningRequirementsService } from "@/services/index.service";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  CLEANING_REQUIREMENT_TYPES,
  type CleaningObjectWithRequirements,
  type CleaningRequirementType,
} from "../types";

type CleaningFormState = {
  name: string;
  qr_code: string;
  requirements: Record<CleaningRequirementType, string>;
};

const emptyForm = (): CleaningFormState => ({
  name: "",
  qr_code: "",
  requirements: {
    "Đầu ca": "",
    "Cuối ca": "",
    "Định kỳ": "",
  },
});

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;

  if (Array.isArray(message)) {
    return message.join("; ");
  }

  return message ?? fallback;
};

const getRequirement = (
  object: CleaningObjectWithRequirements,
  type: CleaningRequirementType,
) =>
  object.cleaningRequirements.find(
    (requirement) => requirement.requirement_type === type,
  );

const getRequirementContent = (
  object: CleaningObjectWithRequirements,
  type: CleaningRequirementType,
) => getRequirement(object, type)?.requirement_content ?? "";

const getCreatorLabel = (object: CleaningObjectWithRequirements) =>
  object.createdBy?.name ??
  object.createdBy?.username ??
  object.createdBy?.email ??
  object.created_by_id ??
  "";

export default function CleaningRequirementsPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObject, setEditingObject] =
    useState<CleaningObjectWithRequirements | null>(null);
  const [deletingObject, setDeletingObject] =
    useState<CleaningObjectWithRequirements | null>(null);
  const [form, setForm] = useState<CleaningFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: cleaningObjects,
    error,
    isLoading,
    mutate,
  } = useSWR(
    "/cleaning-objects-with-requirements",
    cleaningRequirementsService.fetchCleaningObjectsWithRequirements,
  );

  const filteredObjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");

    return [...(cleaningObjects ?? [])]
      .filter((object) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          object.id,
          object.name,
          object.qr_code,
          getCreatorLabel(object),
          ...CLEANING_REQUIREMENT_TYPES.map((type) =>
            getRequirementContent(object, type),
          ),
        ].some((value) =>
          String(value).toLocaleLowerCase("vi-VN").includes(normalizedKeyword),
        );
      })
      .sort((first, second) => first.id - second.id);
  }, [cleaningObjects, keyword]);

  const openCreateForm = () => {
    setEditingObject(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEditForm = (object: CleaningObjectWithRequirements) => {
    setEditingObject(object);
    setForm({
      name: object.name,
      qr_code: object.qr_code,
      requirements: {
        "Đầu ca": getRequirementContent(object, "Đầu ca"),
        "Cuối ca": getRequirementContent(object, "Cuối ca"),
        "Định kỳ": getRequirementContent(object, "Định kỳ"),
      },
    });
    setIsFormOpen(true);
  };

  const setRequirementContent = (
    type: CleaningRequirementType,
    content: string,
  ) => {
    setForm((current) => ({
      ...current,
      requirements: {
        ...current.requirements,
        [type]: content,
      },
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên đối tượng vệ sinh.");
      return false;
    }

    if (form.name.trim().length > 255) {
      toast.error("Tên đối tượng vệ sinh tối đa 255 ký tự.");
      return false;
    }

    if (!form.qr_code.trim()) {
      toast.error("Vui lòng nhập mã QR.");
      return false;
    }

    if (form.qr_code.trim().length > 255) {
      toast.error("Mã QR tối đa 255 ký tự.");
      return false;
    }

    const missingType = CLEANING_REQUIREMENT_TYPES.find(
      (type) => !form.requirements[type].trim(),
    );
    if (missingType) {
      toast.error(`Vui lòng nhập yêu cầu ${missingType.toLocaleLowerCase("vi-VN")}.`);
      return false;
    }

    return true;
  };

  const createObjectAndRequirements = async () => {
    const createdObject =
      await cleaningRequirementsService.createCleaningObject({
        name: form.name.trim(),
        qr_code: form.qr_code.trim(),
      });

    try {
      await Promise.all(
        CLEANING_REQUIREMENT_TYPES.map((type) =>
          cleaningRequirementsService.createCleaningRequirement({
            cleaning_object_id: createdObject.id,
            requirement_type: type,
            requirement_content: form.requirements[type].trim(),
          }),
        ),
      );
    } catch (requirementError) {
      try {
        await cleaningRequirementsService.deleteCleaningObject(
          createdObject.id,
        );
      } catch {
        // Keep the original API error when rollback is unavailable.
      }
      throw requirementError;
    }
  };

  const updateObjectAndRequirements = async (
    object: CleaningObjectWithRequirements,
  ) => {
    await Promise.all([
      cleaningRequirementsService.updateCleaningObject(object.id, {
        name: form.name.trim(),
        qr_code: form.qr_code.trim(),
      }),
      ...CLEANING_REQUIREMENT_TYPES.map((type) => {
        const existingRequirement = getRequirement(object, type);
        const payload = {
          cleaning_object_id: object.id,
          requirement_type: type,
          requirement_content: form.requirements[type].trim(),
        };

        return existingRequirement
          ? cleaningRequirementsService.updateCleaningRequirement(
              existingRequirement.id,
              payload,
            )
          : cleaningRequirementsService.createCleaningRequirement(payload);
      }),
    ]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingObject) {
        await updateObjectAndRequirements(editingObject);
        toast.success("Đã cập nhật đối tượng và các yêu cầu vệ sinh.");
      } else {
        await createObjectAndRequirements();
        toast.success("Đã tạo đối tượng và 3 yêu cầu vệ sinh.");
      }

      setIsFormOpen(false);
      await mutate();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingObject
            ? "Không thể cập nhật yêu cầu vệ sinh."
            : "Không thể tạo yêu cầu vệ sinh.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingObject) {
      return;
    }

    setIsSubmitting(true);
    try {
      await cleaningRequirementsService.deleteCleaningObject(
        deletingObject.id,
      );
      toast.success("Đã xóa đối tượng và các yêu cầu vệ sinh liên quan.");
      setDeletingObject(null);
      await mutate();
    } catch (deleteError) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa yêu cầu vệ sinh."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Yêu cầu vệ sinh</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý đối tượng vệ sinh và yêu cầu thực hiện theo từng thời điểm.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              disabled={isLoading}
              title="Tải lại"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="size-4" />
              Thêm
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo tên, mã QR, nội dung yêu cầu hoặc người tạo"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách yêu cầu vệ sinh.
          </div>
        ) : (
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="min-w-48">Tên</TableHead>
                <TableHead className="min-w-36">QR</TableHead>
                <TableHead className="min-w-56">Đầu ca</TableHead>
                <TableHead className="min-w-56">Cuối ca</TableHead>
                <TableHead className="min-w-56">Định kỳ</TableHead>
                <TableHead className="min-w-36">Người tạo</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8}>
                      <div className="h-10 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredObjects.length > 0 ? (
                filteredObjects.map((object) => (
                  <TableRow key={object.id} className="align-top">
                    <TableCell className="text-gray-500">{object.id}</TableCell>
                    <TableCell className="font-medium">{object.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {object.qr_code}
                    </TableCell>
                    {CLEANING_REQUIREMENT_TYPES.map((type) => (
                      <TableCell
                        key={type}
                        className="max-w-72 whitespace-pre-wrap break-words text-sm leading-5"
                      >
                        {getRequirementContent(object, type)}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm text-gray-500">
                      {getCreatorLabel(object)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(object)}
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingObject(object)}
                          title="Xóa"
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    Chưa có yêu cầu vệ sinh phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => !isSubmitting && setIsFormOpen(open)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingObject
                ? "Cập nhật yêu cầu vệ sinh"
                : "Thêm yêu cầu vệ sinh"}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="cleaning-object-name">Tên *</Label>
              <Input
                id="cleaning-object-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={255}
                disabled={isSubmitting}
                placeholder="Bàn đóng gói số 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cleaning-object-qr">Mã QR *</Label>
              <Input
                id="cleaning-object-qr"
                value={form.qr_code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    qr_code: event.target.value,
                  }))
                }
                maxLength={255}
                disabled={isSubmitting}
                placeholder="CLEAN-OBJ-001"
              />
            </div>

            {CLEANING_REQUIREMENT_TYPES.map((type) => (
              <div className="space-y-2" key={type}>
                <Label htmlFor={`cleaning-requirement-${type}`}>
                  {type} *
                </Label>
                <Textarea
                  id={`cleaning-requirement-${type}`}
                  value={form.requirements[type]}
                  onChange={(event) =>
                    setRequirementContent(type, event.target.value)
                  }
                  disabled={isSubmitting}
                  rows={3}
                  placeholder={`Nhập yêu cầu vệ sinh ${type.toLocaleLowerCase("vi-VN")}`}
                />
              </div>
            ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
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

      <Dialog
        open={Boolean(deletingObject)}
        onOpenChange={(open) =>
          !open && !isSubmitting && setDeletingObject(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa yêu cầu vệ sinh</DialogTitle>
            <DialogDescription>
              Đối tượng vệ sinh và toàn bộ yêu cầu thuộc đối tượng sẽ bị xóa.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingObject?.name}</div>
            <div className="mt-1 font-mono text-xs text-gray-500">
              {deletingObject?.qr_code}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingObject(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
