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
import { Textarea } from "@/components/ui/textarea";
import { productionWorkshopsService } from "@/services/index.service";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  CreateProductionWorkshopPayload,
  ProductionWorkshop,
  UpdateProductionWorkshopPayload,
} from "../types";

type WorkshopFormState = {
  code: string;
  name: string;
  description: string;
  address: string;
};

const emptyForm: WorkshopFormState = {
  code: "",
  name: "",
  description: "",
  address: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const formatDateTime = (value?: string) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN");
};

const createPayload = (
  form: WorkshopFormState,
): CreateProductionWorkshopPayload => {
  const description = form.description.trim();
  const address = form.address.trim();

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    ...(description ? { description } : {}),
    ...(address ? { address } : {}),
  };
};

const updatePayload = (
  form: WorkshopFormState,
  workshop: ProductionWorkshop,
): UpdateProductionWorkshopPayload => {
  const payload: UpdateProductionWorkshopPayload = {};
  const name = form.name.trim();
  const description = form.description.trim();
  const address = form.address.trim();

  if (name !== (workshop.name ?? "")) {
    payload.name = name;
  }

  if (description !== (workshop.description ?? "")) {
    payload.description = description;
  }

  if (address !== (workshop.address ?? "")) {
    payload.address = address;
  }

  return payload;
};

export default function ProductionWorkshopsPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] =
    useState<ProductionWorkshop | null>(null);
  const [deletingWorkshop, setDeletingWorkshop] =
    useState<ProductionWorkshop | null>(null);
  const [form, setForm] = useState<WorkshopFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: workshops,
    error,
    isLoading,
    mutate,
  } = useSWR("/production-workshops", productionWorkshopsService.fetchProductionWorkshops);

  const filteredWorkshops = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (workshops ?? [])
      .filter((workshop) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          workshop.code,
          workshop.name,
          workshop.description,
          workshop.address,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedKeyword),
          );
      })
      .sort((first, second) => first.code.localeCompare(second.code));
  }, [workshops, keyword]);

  const openCreateForm = () => {
    setEditingWorkshop(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (workshop: ProductionWorkshop) => {
    setEditingWorkshop(workshop);
    setForm({
      code: workshop.code ?? "",
      name: workshop.name ?? "",
      description: workshop.description ?? "",
      address: workshop.address ?? "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error("Vui lòng nhập mã xưởng.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên xưởng.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWorkshop) {
        const payload = updatePayload(form, editingWorkshop);

        if (Object.keys(payload).length === 0) {
          toast.info("Không có thay đổi để lưu.");
          setIsSubmitting(false);
          return;
        }

        await productionWorkshopsService.updateProductionWorkshop(
          editingWorkshop.id,
          payload,
        );
        toast.success("Đã cập nhật nhà xưởng.");
      } else {
        await productionWorkshopsService.createProductionWorkshop(
          createPayload(form),
        );
        toast.success("Đã tạo nhà xưởng.");
      }

      setIsFormOpen(false);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu nhà xưởng."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingWorkshop) {
      return;
    }

    setIsSubmitting(true);
    try {
      await productionWorkshopsService.deleteProductionWorkshop(
        deletingWorkshop.id,
      );
      toast.success("Đã xóa nhà xưởng.");
      setDeletingWorkshop(null);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa nhà xưởng."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Nhà xưởng</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách xưởng sản xuất.
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
              Thêm xưởng
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo mã, tên, mô tả, địa chỉ"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách nhà xưởng.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-36">Mã xưởng</TableHead>
                <TableHead className="w-56">Tên xưởng</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead className="w-44">Cập nhật</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <div className="h-8 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredWorkshops.length > 0 ? (
                filteredWorkshops.map((workshop) => (
                  <TableRow key={workshop.id}>
                    <TableCell className="text-gray-500">
                      {workshop.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {workshop.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {workshop.name}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal break-words text-sm text-gray-600">
                      {workshop.description ?? ""}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal break-words text-sm text-gray-600">
                      {workshop.address ?? ""}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(workshop.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(workshop)}
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingWorkshop(workshop)}
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
                    colSpan={7}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    Chưa có nhà xưởng phù hợp.
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
              {editingWorkshop ? "Cập nhật nhà xưởng" : "Thêm nhà xưởng"}
            </DialogTitle>
            <DialogDescription>
              Mã xưởng và tên xưởng là bắt buộc. Mô tả và địa chỉ là tùy chọn.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="workshop-code">
                Mã xưởng
              </label>
              <Input
                id="workshop-code"
                value={form.code}
                disabled={isSubmitting || Boolean(editingWorkshop)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="workshop-name">
                Tên xưởng
              </label>
              <Input
                id="workshop-name"
                value={form.name}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="workshop-description"
              >
                Mô tả
              </label>
              <Textarea
                id="workshop-description"
                value={form.description}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="workshop-address">
                Địa chỉ
              </label>
              <Input
                id="workshop-address"
                value={form.address}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
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
        open={Boolean(deletingWorkshop)}
        onOpenChange={(open) =>
          !open && !isSubmitting && setDeletingWorkshop(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nhà xưởng</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa nhà xưởng này khỏi danh mục?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingWorkshop?.name}</div>
            <div className="mt-1 font-mono text-xs text-gray-500">
              {deletingWorkshop?.code}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingWorkshop(null)}
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
