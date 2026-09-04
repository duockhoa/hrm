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
import type { ProductionWorkshopPressureDifferential } from "../../types";
import FormProductionWorkshopPressureDifferential from "../form-production-workshop-pressure-differential/form-production-workshop-pressure-differential";

type ProductionWorkshopPressureDifferentialsPageProps = {
  workshopId: string | number;
  workshop?: ProductionWorkshop;
};

const getRecordTime = (record: ProductionWorkshopPressureDifferential) =>
  record.checked_at ?? record.created_at ?? record.updated_at;

const formatDateGroup = (value?: string) => {
  if (!value) {
    return "Không rõ ngày";
  }

  return new Date(value).toLocaleDateString("vi-VN");
};

const getDateGroupKey = (value?: string) => {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDayPeriod = (value?: string) => {
  if (!value) {
    return "-";
  }

  return new Date(value).getHours() < 12 ? "Sáng" : "Chiều";
};

const getUserLabel = (
  user?: ProductionWorkshopPressureDifferential["createdBy"],
) => user?.name ?? user?.username ?? user?.email ?? "-";

const groupRecordsByDate = (
  records: ProductionWorkshopPressureDifferential[],
) => {
  const groups: {
    key: string;
    label: string;
    records: ProductionWorkshopPressureDifferential[];
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

const parseNumber = (value: string) => Number(value.replace(",", "."));

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(value);

const formatPressureRequirement = (qrCode?: string) => {
  if (!qrCode) {
    return "-";
  }

  const specText = qrCode.includes("$")
    ? qrCode.slice(qrCode.lastIndexOf("$") + 1)
    : qrCode;
  const match = specText.match(
    /(-?\d+(?:[.,]\d+)?)\s*±\s*(\d+(?:[.,]\d+)?)\s*(?:-\s*([^\s]+))?/i,
  );

  if (!match) {
    return "-";
  }

  const target = parseNumber(match[1]);
  const tolerance = parseNumber(match[2]);

  if (Number.isNaN(target) || Number.isNaN(tolerance)) {
    return "-";
  }

  const unit = match[3] || "Pa";
  return `${formatNumber(target)}±${formatNumber(tolerance)} ${unit}`;
};

export default function ProductionWorkshopPressureDifferentialsPage({
  workshopId,
  workshop,
}: ProductionWorkshopPressureDifferentialsPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ProductionWorkshopPressureDifferential | null>(null);
  const [deletingRecord, setDeletingRecord] =
    useState<ProductionWorkshopPressureDifferential | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(
    API_ROUTES.productionWorkshops.pressureDifferentials(workshopId),
    () => productionWorkshopsService.fetchPressureDifferentials(workshopId),
  );
  const groupedRecords = records ? groupRecordsByDate(records) : [];

  const openCreateForm = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const openEditForm = (record: ProductionWorkshopPressureDifferential) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) {
      return;
    }

    setIsDeleting(true);
    try {
      await productionWorkshopsService.deletePressureDifferential(
        deletingRecord.id,
      );
      toast.success("Đã xóa chênh áp.");
      setDeletingRecord(null);
      await mutate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa chênh áp."));
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
              Không thể tải danh sách chênh áp.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-24">Buổi</TableHead>
                  <TableHead>QR code</TableHead>
                  <TableHead className="w-44">Yêu cầu</TableHead>
                  <TableHead className="w-32">Chênh áp</TableHead>
                  <TableHead className="w-32">Kết luận</TableHead>
                  <TableHead className="w-40">Người nhập</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <div className="h-8 animate-pulse rounded bg-gray-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : groupedRecords.length > 0 ? (
                  groupedRecords.map((group) => (
                    <Fragment key={group.key}>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell
                          colSpan={7}
                          className="font-medium text-gray-900"
                        >
                          {group.label}
                        </TableCell>
                      </TableRow>
                      {group.records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm text-gray-600">
                            {formatDayPeriod(getRecordTime(record))}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.gauge_name}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatPressureRequirement(record.gauge_name)}
                          </TableCell>
                          <TableCell>
                            {record.differential_pressure} {record.unit ?? "Pa"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.conclusion === "dat"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {record.conclusion === "dat"
                                ? "Đạt"
                                : "Không đạt"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getUserLabel(record.createdBy)}</TableCell>
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
                      colSpan={7}
                      className="h-32 text-center text-sm text-gray-500"
                    >
                      Chưa có bản ghi chênh áp.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <FormProductionWorkshopPressureDifferential
          key={`${isFormOpen ? "open" : "closed"}-${editingRecord?.id ?? "create"}`}
          workshopId={workshopId}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          pressureDifferential={editingRecord}
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
              <DialogTitle>Xóa chênh áp</DialogTitle>
              <DialogDescription>
                Thao tác này sẽ xóa bản ghi chênh áp khỏi danh sách.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded border bg-gray-50 p-3">
              <div className="font-medium">{deletingRecord?.gauge_name}</div>
              <div className="mt-1 text-sm text-gray-500">
                {deletingRecord
                  ? `${deletingRecord.differential_pressure} ${deletingRecord.unit ?? "Pa"}`
                  : ""}
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
