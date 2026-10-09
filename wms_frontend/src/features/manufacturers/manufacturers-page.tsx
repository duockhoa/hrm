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
import { API_ROUTES } from "@/lib/api-routes";
import { matchesSearchKeyword } from "@/lib/search-utils";
import { manufacturersService } from "@/services/index.service";
import axios from "axios";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { Manufacturer } from "./types";

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<{ message?: string | string[] }>(error))
    return fallback;
  const message = error.response?.data?.message;
  const normalized = Array.isArray(message) ? message.join("; ") : message;
  const messages: Record<string, string> = {
    "Manufacturer not found":
      "Không tìm thấy nhà sản xuất. Vui lòng tải lại danh sách.",
    "Manufacturer code already exists":
      "Mã nhà sản xuất đã tồn tại. Vui lòng thử lại.",
    "Manufacturer is referenced by warehouse receipts or its creator no longer exists":
      "Nhà sản xuất đang được hàng nhập kho tham chiếu hoặc tài khoản người thêm không còn tồn tại.",
    "manufacturer_name is required and must be a string":
      "Vui lòng nhập tên nhà sản xuất.",
    "manufacturer_name must not exceed 255 characters":
      "Tên nhà sản xuất không được quá 255 ký tự.",
    "No update data provided": "Không có dữ liệu cần cập nhật.",
  };
  return (normalized && messages[normalized]) || fallback;
}

export default function ManufacturersPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Manufacturer | null>(null);
  const [deletingItem, setDeletingItem] = useState<Manufacturer | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const {
    data = [],
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(API_ROUTES.manufacturers.base, manufacturersService.fetchAll);
  const filteredItems = useMemo(
    () =>
      data.filter((item) =>
        matchesSearchKeyword(
          [item.manufacturer_code, item.manufacturer_name],
          keyword,
        ),
      ),
    [data, keyword],
  );

  function openForm(item: Manufacturer | null) {
    setEditingItem(item);
    setName(item?.manufacturer_name ?? "");
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 255) {
      toast.error(
        !trimmedName
          ? "Vui lòng nhập tên nhà sản xuất."
          : "Tên nhà sản xuất không được quá 255 ký tự.",
      );
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const payload = { manufacturer_name: trimmedName };
      const saved = editingItem
        ? await manufacturersService.update(editingItem.id, payload)
        : await manufacturersService.create(payload);
      // Update the list immediately so a later refresh failure cannot repeat a write.
      await mutate(
        (current = []) =>
          (editingItem
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved]
          ).sort((a, b) =>
            a.manufacturer_code.localeCompare(b.manufacturer_code),
          ),
        { revalidate: false },
      );
      toast.success(
        editingItem ? "Đã cập nhật nhà sản xuất." : "Đã thêm nhà sản xuất.",
      );
      setIsFormOpen(false);
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          "Không thể lưu nhà sản xuất. Vui lòng thử lại.",
        ),
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingItem || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await manufacturersService.delete(deletingItem.id);
      await mutate(
        (current = []) => current.filter((item) => item.id !== deletingItem.id),
        { revalidate: false },
      );
      toast.success("Đã xóa nhà sản xuất.");
      setDeletingItem(null);
    } catch (deleteError) {
      toast.error(
        getErrorMessage(
          deleteError,
          "Không thể xóa nhà sản xuất. Vui lòng thử lại.",
        ),
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Nhà sản xuất</h2>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách nhà sản xuất dùng trong hệ thống.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void mutate()}
              disabled={isValidating || isSubmitting}
              title="Tải lại"
              aria-label="Tải lại danh sách nhà sản xuất"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button onClick={() => openForm(null)} disabled={isSubmitting}>
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
            placeholder="Tìm theo mã hoặc tên nhà sản xuất"
            aria-label="Tìm nhà sản xuất"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error && (
          <div
            role="alert"
            className="mb-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            Không thể tải danh sách nhà sản xuất. Vui lòng nhấn Tải lại.
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-36">Mã nhà sản xuất</TableHead>
              <TableHead>Tên nhà sản xuất</TableHead>
              <TableHead className="w-56">Người thêm</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={4}>
                      <div className="h-10 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  </TableRow>
                ))
              : filteredItems.length
                ? filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-gray-500">
                        {item.manufacturer_code}
                      </TableCell>
                      <TableCell className="max-w-xl whitespace-normal break-words font-medium">
                        {item.manufacturer_name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {item.createdBy?.name ||
                          item.createdBy?.username ||
                          item.created_by_id ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openForm(item)}
                            disabled={isSubmitting}
                            title="Sửa"
                            aria-label={`Sửa ${item.manufacturer_code}`}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingItem(item)}
                            disabled={isSubmitting}
                            title="Xóa"
                            aria-label={`Xóa ${item.manufacturer_code}`}
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : !error && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-32 text-center text-sm text-gray-500"
                      >
                        {keyword.trim()
                          ? "Không tìm thấy nhà sản xuất phù hợp."
                          : "Chưa có nhà sản xuất. Nhấn Thêm để tạo mới."}
                      </TableCell>
                    </TableRow>
                  )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => !submitting.current && setIsFormOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Cập nhật nhà sản xuất" : "Thêm nhà sản xuất"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Cập nhật tên nhà sản xuất."
                : "Nhập tên nhà sản xuất. Mã sẽ được cấp tự động khi lưu."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="manufacturer-code">Mã nhà sản xuất</Label>
              <Input
                id="manufacturer-code"
                value={editingItem?.manufacturer_code ?? ""}
                readOnly
                placeholder="Tự động cấp khi lưu"
                className="bg-gray-50 text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer-name">Tên nhà sản xuất *</Label>
              <Input
                id="manufacturer-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                autoFocus
                required
                maxLength={255}
                placeholder="Nhập tên nhà sản xuất"
              />
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
        onOpenChange={(open) =>
          !open && !submitting.current && setDeletingItem(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nhà sản xuất</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa nhà sản xuất này khỏi danh mục?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3 font-medium">
            {deletingItem?.manufacturer_code} —{" "}
            {deletingItem?.manufacturer_name}
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
