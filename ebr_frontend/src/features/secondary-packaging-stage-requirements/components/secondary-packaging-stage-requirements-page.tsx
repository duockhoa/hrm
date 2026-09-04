"use client";

import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
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
import { API_ROUTES } from "@/lib/api-routes";
import { secondaryPackagingStageRequirementsService } from "@/services/index.service";
import type { SecondaryPackagingStageRequirement } from "../types";

type FormState = {
  stage: string;
  requirement: string;
};

const emptyForm = (): FormState => ({ stage: "", requirement: "" });

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

const getCreatorLabel = (item: SecondaryPackagingStageRequirement) =>
  item.createdBy?.full_name ??
  item.createdBy?.name ??
  item.createdBy?.username ??
  item.createdBy?.email ??
  item.created_by_id ??
  "—";

export default function SecondaryPackagingStageRequirementsPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<SecondaryPackagingStageRequirement | null>(null);
  const [deletingItem, setDeletingItem] =
    useState<SecondaryPackagingStageRequirement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data = [], error, isLoading, mutate } = useSWR(
    API_ROUTES.secondaryPackagingStageRequirements.base,
    secondaryPackagingStageRequirementsService.fetchAll,
  );

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");
    return [...data]
      .filter((item) =>
        !normalizedKeyword
          ? true
          : [item.id, item.stage, item.requirement, getCreatorLabel(item)].some(
              (value) =>
                String(value)
                  .toLocaleLowerCase("vi-VN")
                  .includes(normalizedKeyword),
            ),
      )
      .sort((first, second) => first.id - second.id);
  }, [data, keyword]);

  const openCreateForm = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEditForm = (item: SecondaryPackagingStageRequirement) => {
    setEditingItem(item);
    setForm({ stage: item.stage, requirement: item.requirement });
    setIsFormOpen(true);
  };

  const validateForm = () => {
    if (!form.stage.trim()) {
      toast.error("Vui lòng nhập giai đoạn đóng gói.");
      return false;
    }
    if (form.stage.trim().length > 100) {
      toast.error("Giai đoạn tối đa 100 ký tự.");
      return false;
    }
    if (!form.requirement.trim()) {
      toast.error("Vui lòng nhập yêu cầu.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      stage: form.stage.trim(),
      requirement: form.requirement.trim(),
    };
    try {
      if (editingItem) {
        await secondaryPackagingStageRequirementsService.update(
          editingItem.id,
          payload,
        );
        toast.success("Đã cập nhật yêu cầu đóng gói bao bì cấp 2.");
      } else {
        await secondaryPackagingStageRequirementsService.create(payload);
        toast.success("Đã thêm yêu cầu đóng gói bao bì cấp 2.");
      }
      setIsFormOpen(false);
      await mutate();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingItem ? "Không thể cập nhật yêu cầu." : "Không thể thêm yêu cầu.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      await secondaryPackagingStageRequirementsService.delete(deletingItem.id);
      toast.success("Đã xóa yêu cầu đóng gói bao bì cấp 2.");
      setDeletingItem(null);
      await mutate();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa yêu cầu."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Yêu cầu đóng gói bao bì cấp 2</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý các giai đoạn và yêu cầu kiểm tra dùng chung.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isLoading} title="Tải lại">
              <RefreshCw className="size-4" />
            </Button>
            <Button onClick={openCreateForm}><Plus className="size-4" /> Thêm</Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="pl-9" placeholder="Tìm theo giai đoạn, yêu cầu hoặc người tạo" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không thể tải danh sách yêu cầu đóng gói bao bì cấp 2.</div>
        ) : (
          <Table className="min-w-[690px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="min-w-48">Giai đoạn</TableHead>
                <TableHead className="min-w-80">Yêu cầu</TableHead>
                <TableHead className="min-w-40">Người tạo</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}><TableCell colSpan={5}><div className="h-10 animate-pulse rounded bg-gray-100" /></TableCell></TableRow>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="align-top">
                    <TableCell className="text-gray-500">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.stage}</TableCell>
                    <TableCell className="max-w-xl whitespace-pre-wrap break-words text-sm leading-5">{item.requirement}</TableCell>
                    <TableCell className="text-sm text-gray-500">{getCreatorLabel(item)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditForm(item)} title="Sửa"><Edit2 className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeletingItem(item)} title="Xóa"><Trash2 className="size-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-sm text-gray-500">Chưa có yêu cầu phù hợp.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => !isSubmitting && setIsFormOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingItem ? "Cập nhật yêu cầu bao bì cấp 2" : "Thêm yêu cầu bao bì cấp 2"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="secondary-packaging-stage">Giai đoạn *</Label>
              <Input id="secondary-packaging-stage" value={form.stage} maxLength={100} disabled={isSubmitting} placeholder="Đóng hộp" onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))} />
              <p className="text-right text-xs text-gray-400">{form.stage.length}/100</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-packaging-requirement">Yêu cầu *</Label>
              <Textarea id="secondary-packaging-requirement" value={form.requirement} rows={5} disabled={isSubmitting} placeholder="Nhãn, số lô và quy cách đóng gói phải đúng yêu cầu" onChange={(event) => setForm((current) => ({ ...current, requirement: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : "Lưu"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && !isSubmitting && setDeletingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa yêu cầu bao bì cấp 2</DialogTitle>
            <DialogDescription>Hạng mục này sẽ bị xóa khỏi danh mục yêu cầu dùng chung.</DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingItem?.stage}</div>
            <div className="mt-1 text-sm text-gray-500">{deletingItem?.requirement}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingItem(null)} disabled={isSubmitting}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? "Đang xóa..." : "Xóa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
