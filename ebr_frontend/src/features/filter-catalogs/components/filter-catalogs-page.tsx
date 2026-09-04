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
import { filterCatalogsService } from "@/services/index.service";
import { Edit2, Eye, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  CreateFilterCatalogPayload,
  FilterCatalog,
  UpdateFilterCatalogPayload,
} from "../types";
import FilterCatalogDetail from "./filter-catalog-detail";

type FilterCatalogFormState = {
  filter_code: string;
  filter_type: string;
  usable_steam_cycles: string;
  pre_filter_sensory_requirement: string;
  post_filter_sensory_requirement: string;
  integrity_requirement: string;
  description: string;
};

const emptyForm: FilterCatalogFormState = {
  filter_code: "",
  filter_type: "",
  usable_steam_cycles: "",
  pre_filter_sensory_requirement: "",
  post_filter_sensory_requirement: "",
  integrity_requirement: "",
  description: "",
};

const FILTER_TYPE_OPTIONS = [
  "Lọc kép 0.45/0.22 µm",
  "Lọc 0.22 µm",
  "Lọc 0.45 µm",
  "Lọc vải",
  "Lọc 1 µm",
  "Lọc 5 µm",
  "Lọc 25 µm",
  "Lọc 50 µm",
  "Lọc bông",
] as const;

const INTEGRITY_REQUIREMENT_OPTIONS = [
  "Độ sụt áp < 25.3 mbar trong 3 phút",
  "Độ sụt áp < 28.3 mbar trong 3 phút",
  "Độ sút áp < 45.1 mbar trong 3 phút",
  "Điểm sủi bọt không quá 52 Psi",
] as const;
const NO_INTEGRITY_REQUIREMENT_VALUE = "__none__";
const PRE_FILTER_SENSORY_REQUIREMENT_OPTIONS = [
  "Tính nguyên vẹn: Trải phẳng vải/túi lọc và quan sát dưới ánh sáng đủ sáng. Bề mặt vải tuyệt đối không được có lỗ thủng, vết rách, hay các vùng bị mỏng/nhão bất thường làm sai lệch kích thước lỗ lọc. Tình trạng sợi vải: Bề mặt không bị xù lông, tưa sợi. Màu sắc: Màu sắc đồng nhất màu trắng, tuyệt đối không có các vết ố vàng, vết bẩn lạ, vệt loang lổ hay dấu hiệu ngả màu do lão hóa vật liệu.",
  "Độ sạch trực quan: Tuyệt đối không có bất kỳ dị vật, bụi bẩn, sợi tơ, vết ố hay tiểu phân lạ nào bám trên toàn bộ bề mặt lõi lọc. Gioăng cao su: Vòng O-ring phải nằm đúng vị trí, không bị đứt, xước xát, dập nát hay biến dạng. Tính nguyên vẹn: Khung nhựa bảo vệ bên ngoài, lõi trung tâm và hai đầu cap không có vết nứt, vỡ hay biến dạng. Lớp màng lọc xếp nếp bên trong không bị dập, rách hay có màu sắc bất thường.",
] as const;
const POST_FILTER_SENSORY_REQUIREMENT_OPTIONS =
  PRE_FILTER_SENSORY_REQUIREMENT_OPTIONS;
const NO_SENSORY_REQUIREMENT_VALUE = "__none_sensory__";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const getUsableSteamCycles = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : Number(trimmedValue);
};

const createPayload = (
  form: FilterCatalogFormState,
): CreateFilterCatalogPayload => ({
  filter_code: form.filter_code.trim(),
  filter_type: form.filter_type.trim(),
  usable_steam_cycles: getUsableSteamCycles(form.usable_steam_cycles),
  pre_filter_sensory_requirement:
    form.pre_filter_sensory_requirement.trim() || null,
  post_filter_sensory_requirement:
    form.post_filter_sensory_requirement.trim() || null,
  integrity_requirement: form.integrity_requirement.trim() || null,
  description: form.description.trim() || null,
});

const updatePayload = (
  form: FilterCatalogFormState,
): UpdateFilterCatalogPayload => ({
  filter_code: form.filter_code.trim(),
  filter_type: form.filter_type.trim(),
  usable_steam_cycles: getUsableSteamCycles(form.usable_steam_cycles),
  pre_filter_sensory_requirement:
    form.pre_filter_sensory_requirement.trim() || null,
  post_filter_sensory_requirement:
    form.post_filter_sensory_requirement.trim() || null,
  integrity_requirement: form.integrity_requirement.trim() || null,
  description: form.description.trim() || null,
});

export default function FilterCatalogsPage() {
  const [keyword, setKeyword] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFilterCatalog, setEditingFilterCatalog] =
    useState<FilterCatalog | null>(null);
  const [deletingFilterCatalog, setDeletingFilterCatalog] =
    useState<FilterCatalog | null>(null);
  const [detailFilterCatalogId, setDetailFilterCatalogId] = useState<
    number | null
  >(null);
  const [form, setForm] = useState<FilterCatalogFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: filterCatalogs,
    error,
    isLoading,
    mutate,
  } = useSWR("/filter-catalogs", filterCatalogsService.fetchFilterCatalogs);

  const filteredFilterCatalogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (filterCatalogs ?? [])
      .filter((filterCatalog) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          filterCatalog.filter_code,
          filterCatalog.filter_type,
          filterCatalog.pre_filter_sensory_requirement,
          filterCatalog.post_filter_sensory_requirement,
          filterCatalog.integrity_requirement,
          filterCatalog.description,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedKeyword));
      })
      .sort((first, second) => second.id - first.id);
  }, [filterCatalogs, keyword]);

  const openCreateForm = () => {
    setEditingFilterCatalog(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (filterCatalog: FilterCatalog) => {
    setEditingFilterCatalog(filterCatalog);
    setForm({
      filter_code: filterCatalog.filter_code,
      filter_type: filterCatalog.filter_type,
      usable_steam_cycles:
        filterCatalog.usable_steam_cycles === null ||
        filterCatalog.usable_steam_cycles === undefined
          ? ""
          : String(filterCatalog.usable_steam_cycles),
      pre_filter_sensory_requirement:
        filterCatalog.pre_filter_sensory_requirement ?? "",
      post_filter_sensory_requirement:
        filterCatalog.post_filter_sensory_requirement ?? "",
      integrity_requirement: filterCatalog.integrity_requirement ?? "",
      description: filterCatalog.description ?? "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.filter_code.trim() || !form.filter_type.trim()) {
      toast.error("Vui lòng nhập mã cột lọc và loại lọc.");
      return;
    }

    const usableSteamCycles = getUsableSteamCycles(form.usable_steam_cycles);
    if (
      usableSteamCycles !== null &&
      (!Number.isInteger(usableSteamCycles) || usableSteamCycles < 0)
    ) {
      toast.error("Số chu kỳ hấp còn dùng phải là số nguyên không âm.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFilterCatalog) {
        await filterCatalogsService.updateFilterCatalog(
          editingFilterCatalog.id,
          updatePayload(form),
        );
        toast.success("Đã cập nhật danh mục cột lọc.");
      } else {
        await filterCatalogsService.createFilterCatalog(createPayload(form));
        toast.success("Đã tạo danh mục cột lọc.");
      }

      setIsFormOpen(false);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu danh mục cột lọc."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFilterCatalog) {
      return;
    }

    setIsSubmitting(true);
    try {
      await filterCatalogsService.deleteFilterCatalog(deletingFilterCatalog.id);
      toast.success("Đã xóa danh mục cột lọc.");
      setDeletingFilterCatalog(null);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa danh mục cột lọc."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Danh mục cột lọc</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý thông tin cột lọc và số chu kỳ hấp còn sử dụng được.
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
              Thêm cột lọc
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo mã, loại hoặc mô tả"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh mục cột lọc.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-40">Mã cột lọc</TableHead>
                <TableHead className="w-40">Loại lọc</TableHead>
                <TableHead className="w-44 text-right">
                  Số lần hấp cho phép
                </TableHead>
                <TableHead className="w-32 text-right">
                  Số lần sử dụng
                </TableHead>
                <TableHead>Yêu cầu cảm quan trước lọc</TableHead>
                <TableHead>Yêu cầu cảm quan sau lọc</TableHead>
                <TableHead>Yêu cầu toàn vẹn</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={10}>
                      <div className="h-8 animate-pulse rounded bg-gray-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredFilterCatalogs.length > 0 ? (
                filteredFilterCatalogs.map((filterCatalog) => (
                  <TableRow key={filterCatalog.id} className="align-top">
                    <TableCell className="text-gray-500">
                      {filterCatalog.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {filterCatalog.filter_code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {filterCatalog.filter_type}
                    </TableCell>
                    <TableCell className="text-right">
                      {filterCatalog.usable_steam_cycles ?? ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {filterCatalog.production_order_filtration_checks_count ?? 0}
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal break-words leading-5">
                      {filterCatalog.pre_filter_sensory_requirement ?? ""}
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal break-words leading-5">
                      {filterCatalog.post_filter_sensory_requirement ?? ""}
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal break-words leading-5">
                      {filterCatalog.integrity_requirement ?? ""}
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal break-words leading-5">
                      {filterCatalog.description ?? ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDetailFilterCatalogId(filterCatalog.id)}
                          title="Chi tiết"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(filterCatalog)}
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingFilterCatalog(filterCatalog)}
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
                    colSpan={10}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    Chưa có danh mục cột lọc phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFilterCatalog
                ? "Cập nhật danh mục cột lọc"
                : "Thêm danh mục cột lọc"}
            </DialogTitle>
            <DialogDescription>
              Mã cột lọc là duy nhất. Số chu kỳ hấp có thể để trống.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-code">
                Mã cột lọc *
              </label>
              <Input
                id="filter-code"
                value={form.filter_code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    filter_code: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-type">
                Loại lọc *
              </label>
              <Select
                value={form.filter_type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    filter_type: value,
                  }))
                }
              >
                <SelectTrigger id="filter-type" className="w-full">
                  <SelectValue placeholder="Chọn loại lọc" />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_TYPE_OPTIONS.map((filterType) => (
                    <SelectItem key={filterType} value={filterType}>
                      {filterType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="usable-steam-cycles"
              >
                Số chu kỳ hấp còn dùng
              </label>
              <Input
                id="usable-steam-cycles"
                inputMode="numeric"
                value={form.usable_steam_cycles}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    usable_steam_cycles: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sensory-requirement">
                Yêu cầu cảm quan trước lọc
              </label>
              <Select
                value={
                  form.pre_filter_sensory_requirement ||
                  NO_SENSORY_REQUIREMENT_VALUE
                }
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    pre_filter_sensory_requirement:
                      value === NO_SENSORY_REQUIREMENT_VALUE ? "" : value,
                  }))
                }
              >
                <SelectTrigger
                  id="sensory-requirement"
                  className="min-h-9 w-full items-start whitespace-normal py-2 text-left data-[size=default]:h-auto [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:leading-5"
                >
                  <SelectValue placeholder="Chọn yêu cầu cảm quan trước lọc" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] [&_[data-radix-select-viewport]]:h-auto"
                >
                  <SelectItem value={NO_SENSORY_REQUIREMENT_VALUE}>
                    Không có yêu cầu
                  </SelectItem>
                  {PRE_FILTER_SENSORY_REQUIREMENT_OPTIONS.map((requirement) => (
                    <SelectItem
                      key={requirement}
                      value={requirement}
                      className="h-auto min-h-9 items-start whitespace-normal py-2 leading-5"
                    >
                      {requirement}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="post-filter-sensory-requirement">
                Yêu cầu cảm quan sau lọc
              </label>
              <Select
                value={
                  form.post_filter_sensory_requirement ||
                  NO_SENSORY_REQUIREMENT_VALUE
                }
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    post_filter_sensory_requirement:
                      value === NO_SENSORY_REQUIREMENT_VALUE ? "" : value,
                  }))
                }
              >
                <SelectTrigger
                  id="post-filter-sensory-requirement"
                  className="min-h-9 w-full items-start whitespace-normal py-2 text-left data-[size=default]:h-auto [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:leading-5"
                >
                  <SelectValue placeholder="Chọn yêu cầu cảm quan sau lọc" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] [&_[data-radix-select-viewport]]:h-auto"
                >
                  <SelectItem value={NO_SENSORY_REQUIREMENT_VALUE}>
                    Không có yêu cầu
                  </SelectItem>
                  {POST_FILTER_SENSORY_REQUIREMENT_OPTIONS.map((requirement) => (
                    <SelectItem
                      key={requirement}
                      value={requirement}
                      className="h-auto min-h-9 items-start whitespace-normal py-2 leading-5"
                    >
                      {requirement}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="integrity-requirement">
                Yêu cầu toàn vẹn
              </label>
              <Select
                value={
                  form.integrity_requirement || NO_INTEGRITY_REQUIREMENT_VALUE
                }
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    integrity_requirement:
                      value === NO_INTEGRITY_REQUIREMENT_VALUE ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="integrity-requirement" className="w-full">
                  <SelectValue placeholder="Chọn yêu cầu toàn vẹn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INTEGRITY_REQUIREMENT_VALUE}>
                    Không có yêu cầu
                  </SelectItem>
                  {INTEGRITY_REQUIREMENT_OPTIONS.map((requirement) => (
                    <SelectItem key={requirement} value={requirement}>
                      {requirement}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-description">
                Mô tả
              </label>
              <Input
                id="filter-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
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
        open={detailFilterCatalogId !== null}
        onOpenChange={(open) => !open && setDetailFilterCatalogId(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[90vh] overflow-y-auto p-0 md:max-w-5xl"
        >
          <DialogTitle className="sr-only">Chi tiết cột lọc</DialogTitle>
          {detailFilterCatalogId !== null ? (
            <FilterCatalogDetail
              id={detailFilterCatalogId}
              onClose={() => setDetailFilterCatalogId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingFilterCatalog)}
        onOpenChange={(open) => !open && setDeletingFilterCatalog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa danh mục cột lọc</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa danh mục cột lọc này?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <div className="font-medium">{deletingFilterCatalog?.filter_type}</div>
            <div className="mt-1 font-mono text-xs text-gray-500">
              {deletingFilterCatalog?.filter_code}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingFilterCatalog(null)}
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
