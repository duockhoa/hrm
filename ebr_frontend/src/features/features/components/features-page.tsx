"use client";

import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { featuresService } from "@/services/index.service";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { FEATURE_KINDS, getFeatureKindOrder } from "../constants";
import type { CreateFeaturePayload, Feature } from "../types";
import FeatureFormDialog from "./feature-form-dialog";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

function FeatureKindBadge({ kind }: { kind: string }) {
  const variant = kind === "action" ? "secondary" : "outline";

  return (
    <Badge variant={variant} className="capitalize">
      {kind}
    </Badge>
  );
}

export default function FeaturesPage() {
  const [keyword, setKeyword] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: features,
    error,
    isLoading,
    mutate,
  } = useSWR("/features", featuresService.fetchFeatures);

  const filteredFeatures = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (features ?? [])
      .filter((feature) =>
        kindFilter === "all" ? true : feature.kind === kindFilter,
      )
      .filter((feature) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [feature.key, feature.label, feature.kind, feature.group_name]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedKeyword));
      })
      .sort((first, second) => {
        const kindOrder =
          getFeatureKindOrder(first.kind) - getFeatureKindOrder(second.kind);

        if (kindOrder !== 0) {
          return kindOrder;
        }

        return first.default_order - second.default_order;
      });
  }, [features, keyword, kindFilter]);

  const openCreateForm = () => {
    setEditingFeature(null);
    setIsFormOpen(true);
  };

  const openEditForm = (feature: Feature) => {
    setEditingFeature(feature);
    setIsFormOpen(true);
  };

  const handleSubmit = async (payload: CreateFeaturePayload) => {
    if (!payload.key || !payload.kind || !payload.label) {
      toast.error("Vui lòng nhập đầy đủ key, loại và tên hiển thị.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFeature) {
        await featuresService.updateFeature(editingFeature.id, {
          key: payload.key,
          label: payload.label,
          kind: payload.kind,
          group_name: payload.group_name,
          default_order: payload.default_order,
        });
        toast.success("Đã cập nhật tính năng.");
      } else {
        await featuresService.createFeature(payload);
        toast.success("Đã tạo tính năng.");
      }

      setIsFormOpen(false);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu tính năng."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFeature) {
      return;
    }

    setIsSubmitting(true);
    try {
      await featuresService.deleteFeature(deletingFeature.id);
      toast.success("Đã xóa tính năng.");
      setDeletingFeature(null);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa tính năng."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Danh mục tính năng</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách action/view chuẩn dùng để cấu hình theo mã hàng.
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
              Thêm tính năng
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="pl-9"
              placeholder="Tìm theo key, tên hiển thị hoặc loại"
            />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {FEATURE_KINDS.map((kind) => (
                <SelectItem key={kind.value} value={kind.value}>
                  {kind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách tính năng.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead className="w-32">Loại</TableHead>
                <TableHead className="w-48">Nhóm tính năng</TableHead>
                <TableHead className="w-28 text-right">Thứ tự</TableHead>
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
              ) : filteredFeatures.length > 0 ? (
                filteredFeatures.map((feature) => (
                  <TableRow key={feature.id}>
                    <TableCell className="text-gray-500">{feature.id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {feature.key}
                    </TableCell>
                    <TableCell className="font-medium">
                      {feature.label}
                    </TableCell>
                    <TableCell>
                      <FeatureKindBadge kind={feature.kind} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {feature.group_name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {feature.default_order}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(feature)}
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingFeature(feature)}
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
                    Chưa có tính năng phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <FeatureFormDialog
        key={`${editingFeature?.id ?? "new"}-${isFormOpen ? "open" : "closed"}`}
        open={isFormOpen}
        feature={editingFeature}
        isSubmitting={isSubmitting}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={Boolean(deletingFeature)}
        onOpenChange={(open) =>
          !open && !isSubmitting && setDeletingFeature(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tính năng</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa tính năng này khỏi danh mục?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingFeature?.label}</div>
            <div className="mt-1 font-mono text-xs text-gray-500">
              {deletingFeature?.key}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingFeature(null)}
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
