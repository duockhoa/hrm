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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import { dosageFormsService } from "@/services/index.service";
import axios from "axios";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { DosageForm } from "../types";

const getCreatorLabel = (item: DosageForm) =>
  item.createdBy?.name ??
  item.createdBy?.username ??
  item.createdBy?.email ??
  item.created_by_id ??
  "—";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const message = error.response?.data?.message;
  const normalizedMessage = Array.isArray(message) ? message.join("; ") : message;

  if (normalizedMessage === "Dosage form not found") {
    return "Không tìm thấy dạng bào chế.";
  }
  if (normalizedMessage === "Dosage form name already exists") {
    return "Tên dạng bào chế đã tồn tại.";
  }
  if (normalizedMessage === "name is required") {
    return "Vui lòng nhập tên dạng bào chế.";
  }
  if (normalizedMessage === "sensory_requirement must be a string") {
    return "Yêu cầu cảm quan phải là chuỗi ký tự.";
  }
  if (normalizedMessage === "No update data provided") {
    return "Không có dữ liệu cần cập nhật.";
  }

  return normalizedMessage ?? error.message ?? fallback;
};

export default function DosageFormsPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DosageForm | null>(null);
  const [deletingItem, setDeletingItem] = useState<DosageForm | null>(null);
  const [name, setName] = useState("");
  const [sensoryRequirement, setSensoryRequirement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data = [], error, isLoading, mutate } = useSWR(
    API_ROUTES.dosageForms.base,
    dosageFormsService.fetchAll,
  );

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");

    return data.filter((item) =>
      item.name.toLocaleLowerCase("vi-VN").includes(normalizedKeyword),
    );
  }, [data, keyword]);

  const openCreateForm = () => {
    setEditingItem(null);
    setName("");
    setSensoryRequirement("");
    setIsFormOpen(true);
  };

  const openEditForm = (item: DosageForm) => {
    setEditingItem(item);
    setName(item.name);
    setSensoryRequirement(item.sensory_requirement ?? "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedSensoryRequirement = sensoryRequirement.trim();
    if (!trimmedName) {
      toast.error("Vui lòng nhập tên dạng bào chế.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await dosageFormsService.update(editingItem.id, {
          name: trimmedName,
          sensory_requirement: trimmedSensoryRequirement || null,
        });
        toast.success("Đã cập nhật dạng bào chế.");
      } else {
        await dosageFormsService.create({
          name: trimmedName,
          sensory_requirement: trimmedSensoryRequirement || null,
        });
        toast.success("Đã thêm dạng bào chế.");
      }

      setIsFormOpen(false);
      await mutate();
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, "Không thể lưu dạng bào chế."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);
    try {
      await dosageFormsService.delete(deletingItem.id);
      toast.success("Đã xóa dạng bào chế.");
      setDeletingItem(null);
      await mutate();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa dạng bào chế."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dạng bào chế</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách dạng bào chế dùng trong hệ thống.
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
              <Plus className="size-4" /> Thêm
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo tên dạng bào chế"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách dạng bào chế.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Tên dạng bào chế</TableHead>
                <TableHead>Yêu cầu cảm quan</TableHead>
                <TableHead className="w-56">Người tạo</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <div className="h-10 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-gray-500">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-xl whitespace-pre-wrap break-words text-sm text-gray-600">
                      {item.sensory_requirement || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {getCreatorLabel(item)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(item)}
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingItem(item)}
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
                    colSpan={5}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    Chưa có dạng bào chế phù hợp.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Cập nhật dạng bào chế" : "Thêm dạng bào chế"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="dosage-form-name">Tên dạng bào chế *</Label>
              <Input
                id="dosage-form-name"
                value={name}
                disabled={isSubmitting}
                autoFocus
                placeholder="Viên nén bao phim"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dosage-form-sensory-requirement">
                Yêu cầu cảm quan
              </Label>
              <Textarea
                id="dosage-form-sensory-requirement"
                value={sensoryRequirement}
                disabled={isSubmitting}
                rows={5}
                placeholder="Bề mặt đồng đều, không nứt vỡ."
                onChange={(event) => setSensoryRequirement(event.target.value)}
              />
              <p className="text-xs text-gray-500">
                Có thể để trống nếu dạng bào chế chưa có yêu cầu cảm quan.
              </p>
            </div>
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
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && !isSubmitting && setDeletingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa dạng bào chế</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa dạng bào chế này khỏi danh mục?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3 font-medium">
            {deletingItem?.name}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingItem(null)}
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
