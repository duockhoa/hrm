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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { productLinesService } from "@/services/index.service";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  CreateProductLinePayload,
  ProductLine,
  UpdateProductLinePayload,
} from "../types";

type ProductLineFormState = {
  code: string;
  name: string;
};

const emptyForm: ProductLineFormState = {
  code: "",
  name: "",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN");
};

const createPayload = (form: ProductLineFormState): CreateProductLinePayload => {
  const code = form.code.trim();

  return {
    name: form.name.trim(),
    ...(code ? { code } : {}),
  };
};

const updatePayload = (form: ProductLineFormState): UpdateProductLinePayload => {
  const code = form.code.trim();

  return {
    name: form.name.trim(),
    code: code ? code : null,
  };
};

export default function ProductLinesPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductLine, setEditingProductLine] =
    useState<ProductLine | null>(null);
  const [deletingProductLine, setDeletingProductLine] =
    useState<ProductLine | null>(null);
  const [form, setForm] = useState<ProductLineFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: productLines,
    error,
    isLoading,
    mutate,
  } = useSWR("/product-lines", productLinesService.fetchProductLines);

  const filteredProductLines = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (productLines ?? [])
      .filter((productLine) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [productLine.code, productLine.name]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedKeyword));
      })
      .sort((first, second) => first.code.localeCompare(second.code));
  }, [productLines, keyword]);

  const openCreateForm = () => {
    setEditingProductLine(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (productLine: ProductLine) => {
    setEditingProductLine(productLine);
    setForm({
      code: productLine.code,
      name: productLine.name,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên dòng sản phẩm.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProductLine) {
        await productLinesService.updateProductLine(
          editingProductLine.id,
          updatePayload(form),
        );
        toast.success("Đã cập nhật dòng sản phẩm.");
      } else {
        await productLinesService.createProductLine(createPayload(form));
        toast.success("Đã tạo dòng sản phẩm.");
      }

      setIsFormOpen(false);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu dòng sản phẩm."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProductLine) {
      return;
    }

    setIsSubmitting(true);
    try {
      await productLinesService.deleteProductLine(deletingProductLine.id);
      toast.success("Đã xóa dòng sản phẩm.");
      setDeletingProductLine(null);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa dòng sản phẩm."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dòng sản phẩm</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách dây chuyền hoặc dòng sản phẩm.
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
              Thêm dòng
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách dòng sản phẩm.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-48">Code</TableHead>
                <TableHead>Tên dòng</TableHead>
                <TableHead className="w-44">Cập nhật</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <div className="h-8 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredProductLines.length > 0 ? (
                filteredProductLines.map((productLine) => (
                  <TableRow key={productLine.id}>
                    <TableCell className="text-gray-500">
                      {productLine.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {productLine.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {productLine.name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(productLine.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(productLine)}
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingProductLine(productLine)}
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
                    Chưa có dòng sản phẩm phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProductLine ? "Cập nhật dòng sản phẩm" : "Thêm dòng sản phẩm"}
            </DialogTitle>
            <DialogDescription>
              Để trống code nếu muốn backend tự sinh từ tên.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="product-line-code">
                Code
              </label>
              <Input
                id="product-line-code"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="product-line-name">
                Tên dòng
              </label>
              <Input
                id="product-line-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
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
        open={Boolean(deletingProductLine)}
        onOpenChange={(open) => !open && setDeletingProductLine(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa dòng sản phẩm</DialogTitle>
            <DialogDescription>
              API sẽ set deleted_at và không xóa cứng bản ghi.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingProductLine?.name}</div>
            <div className="mt-1 font-mono text-xs text-gray-500">
              {deletingProductLine?.code}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingProductLine(null)}
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
