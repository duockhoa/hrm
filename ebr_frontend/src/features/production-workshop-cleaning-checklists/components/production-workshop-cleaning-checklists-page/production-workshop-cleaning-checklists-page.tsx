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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HeaderDetailProductionWorkshop,
  type ProductionWorkshop,
} from "@/features/production-workshops";
import { API_ROUTES } from "@/lib/api-routes";
import { productionWorkshopsService } from "@/services/index.service";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { ProductionWorkshopCleaningChecklist } from "../../types";
import FormProductionWorkshopCleaningChecklist from "../form-production-workshop-cleaning-checklist/form-production-workshop-cleaning-checklist";

type ProductionWorkshopCleaningChecklistsPageProps = {
  workshopId: string | number;
  workshop?: ProductionWorkshop;
};

const getRecordTime = (record: ProductionWorkshopCleaningChecklist) =>
  record.created_at ?? record.updated_at;

const formatDateGroup = (value?: string) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Không rõ ngày";

const getDateGroupKey = (value?: string) => {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const formatTime = (value?: string) =>
  value
    ? new Date(value).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const getUserLabel = (
  user?: ProductionWorkshopCleaningChecklist["cleanedBy"],
) => user?.name ?? user?.username ?? user?.email ?? "-";

const isPassedResult = (result: string) => {
  const normalizedResult = result.trim().toLocaleLowerCase("vi-VN");
  return normalizedResult === "đạt" || normalizedResult === "dat";
};

const groupRecordsByDate = (
  records: ProductionWorkshopCleaningChecklist[],
) => {
  const groups: {
    key: string;
    label: string;
    records: ProductionWorkshopCleaningChecklist[];
  }[] = [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  records.forEach((record) => {
    const recordTime = getRecordTime(record);
    const key = getDateGroupKey(recordTime);
    const existingGroup = groupMap.get(key);

    if (existingGroup) {
      existingGroup.records.push(record);
      return;
    }

    const group = {
      key,
      label: formatDateGroup(recordTime),
      records: [record],
    };
    groups.push(group);
    groupMap.set(key, group);
  });

  return groups;
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function ProductionWorkshopCleaningChecklistsPage({
  workshopId,
  workshop,
}: ProductionWorkshopCleaningChecklistsPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ProductionWorkshopCleaningChecklist | null>(null);
  const [deletingRecord, setDeletingRecord] =
    useState<ProductionWorkshopCleaningChecklist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(
    API_ROUTES.productionWorkshops.cleaningChecklists(workshopId),
    () => productionWorkshopsService.fetchCleaningChecklists(workshopId),
  );
  const groupedRecords = records ? groupRecordsByDate(records) : [];

  const openCreateForm = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const openEditForm = (record: ProductionWorkshopCleaningChecklist) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) {
      return;
    }

    setIsDeleting(true);
    try {
      await productionWorkshopsService.deleteCleaningChecklist(
        deletingRecord.id,
      );
      toast.success("Đã xóa checklist vệ sinh.");
      setDeletingRecord(null);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa checklist vệ sinh."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <HeaderDetailProductionWorkshop
        workshop={workshop}
        action={
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="size-4" />
            Thêm
          </Button>
        }
      />

      <div className="mt-2 w-full rounded-lg border bg-white md:mt-4">
        <div className="min-h-0 overflow-auto p-4">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Không thể tải danh sách checklist vệ sinh.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20">Giờ</TableHead>
                  <TableHead className="min-w-40">Đối tượng</TableHead>
                  <TableHead className="min-w-40">Loại vệ sinh</TableHead>
                  <TableHead className="min-w-52">Yêu cầu</TableHead>
                  <TableHead className="min-w-28">Kết quả</TableHead>
                  <TableHead className="min-w-40">Người vệ sinh</TableHead>
                  <TableHead className="min-w-44">Ghi chú</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8}>
                        <div className="h-8 animate-pulse rounded bg-gray-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : groupedRecords.length > 0 ? (
                  groupedRecords.map((group) => (
                    <Fragment key={group.key}>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell
                          colSpan={8}
                          className="font-medium text-gray-900"
                        >
                          {group.label}
                        </TableCell>
                      </TableRow>
                      {group.records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm text-gray-600">
                            {formatTime(getRecordTime(record))}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.subject}
                          </TableCell>
                          <TableCell>{record.category}</TableCell>
                          <TableCell className="whitespace-normal text-sm text-gray-600">
                            {record.requirement}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isPassedResult(record.result)
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {record.result}
                            </Badge>
                          </TableCell>
                          <TableCell>{getUserLabel(record.cleanedBy)}</TableCell>
                          <TableCell className="whitespace-normal text-sm text-gray-600">
                            {record.note || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditForm(record)}
                                title="Sửa"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeletingRecord(record)}
                                title="Xóa"
                              >
                                <Trash2 className="size-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-sm text-gray-500"
                    >
                      Chưa có checklist vệ sinh.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <FormProductionWorkshopCleaningChecklist
          key={`${isFormOpen ? "open" : "closed"}-${editingRecord?.id ?? "create"}`}
          workshopId={workshopId}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          cleaningChecklist={editingRecord}
          onSaved={async () => {
            await mutate();
          }}
        />

        <Dialog
          open={Boolean(deletingRecord)}
          onOpenChange={(open) => !open && setDeletingRecord(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xóa checklist vệ sinh</DialogTitle>
              <DialogDescription>
                Thao tác này sẽ xóa checklist vệ sinh khỏi danh sách.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded border bg-gray-50 p-3">
              <div className="font-medium">{deletingRecord?.subject}</div>
              <div className="mt-1 text-sm text-gray-500">
                {deletingRecord?.category}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingRecord(null)}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
