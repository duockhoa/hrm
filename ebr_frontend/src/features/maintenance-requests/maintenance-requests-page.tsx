"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import { Edit2, Plus, Trash2 } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  maintenanceRequestsKey,
  maintenanceRequestsService as service,
  type MaintenanceRequest,
} from "@/services/maintenance-requests.service";
import MaintenanceRequestFormDialog from "./maintenance-request-form-dialog";
import { errorMessage, isRequestLocked, priorities, priorityColors } from "./utils";

export default function MaintenanceRequestsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(maintenanceRequestsKey, service.list);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceRequest | null>(null);
  const [removing, setRemoving] = useState(false);
  const groups = new Map<string, MaintenanceRequest[]>();
  for (const record of records ?? []) {
    const date = new Date(record.createdAt).toLocaleDateString("vi-VN");
    groups.set(date, [...(groups.get(date) ?? []), record]);
  }

  function openForm(record: MaintenanceRequest | null) {
    setEditing(record);
    setOpen(true);
  }

  async function remove() {
    if (!deleting || removing) return;
    setRemoving(true);
    try {
      await service.remove(deleting.id);
      toast.success("Đã xóa báo cáo sự cố.");
      if (pathname === `/maintenance-requests/${encodeURIComponent(deleting.id)}`) {
        router.push("/maintenance-requests");
      }
      setDeleting(null);
      await mutate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href="/maintenance-requests">Báo cáo sự cố</Link>
          </div>
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="size-4" />
            Thêm
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <p role="alert" className="p-4 text-sm text-red-600">
            Không thể tải báo cáo sự cố. {errorMessage(error)}
          </p>
        ) : isLoading ? (
          Array.from({ length: 10 }, (_, index) => (
            <div
              key={index}
              className="flex min-h-[100px] items-center gap-4 border-b border-gray-200 px-3 py-4"
            >
              <div className="flex-1">
                <Skeleton className="mb-2 h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))
        ) : groups.size ? (
          Array.from(groups, ([date, items]) => (
            <Fragment key={date}>
              <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                {date}
              </div>
              {items.map((record) => {
                const reporterName =
                  record.reporterName?.trim() || record.reporter?.name?.trim();
                const locked = isRequestLocked(record);
                return (
                  <div
                    key={record.id}
                    className={`flex min-h-[100px] items-center gap-4 border-b border-gray-200 px-3 py-4 ${pathname === `/maintenance-requests/${encodeURIComponent(record.id)}` ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}
                  >
                    <Link
                      href={`/maintenance-requests/${encodeURIComponent(record.id)}`}
                      className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                      aria-label={`Xem báo cáo ${record.requestCode}: ${record.title}`}
                    >
                      <p
                        className="truncate text-sm font-bold text-gray-900"
                        title={record.title}
                      >
                        {record.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-gray-600">
                        {record.equipment?.code} · {record.requestCode}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                        {record.description}
                      </p>
                    </Link>
                    <div className="shrink-0 text-right">
                      {reporterName ? (
                        <p className="mb-1 text-sm text-gray-600">
                          {reporterName}
                        </p>
                      ) : null}
                      <p
                        className={`text-xs font-semibold ${priorityColors[record.priority] ?? "text-gray-600"}`}
                      >
                        {priorities[record.priority] ?? record.priority}
                      </p>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Sửa ${record.requestCode}`}
                          title={
                            locked
                              ? "Báo cáo đã đóng hoặc đã có lệnh công việc nên không thể sửa"
                              : "Sửa"
                          }
                          disabled={locked}
                          onClick={() => openForm(record)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Xóa ${record.requestCode}`}
                          title="Xóa"
                          onClick={() => setDeleting(record)}
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            Chưa có báo cáo sự cố.
          </p>
        )}
      </div>
      {open ? (
        <MaintenanceRequestFormDialog record={editing} onClose={() => setOpen(false)} />
      ) : null}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value && !removing) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa báo cáo sự cố</DialogTitle>
            <DialogDescription>
              Xóa vĩnh viễn báo cáo {deleting?.requestCode} và dữ liệu xử lý
              liên quan. Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded border bg-gray-50 p-3 text-sm">
            {deleting?.title}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={removing}
              onClick={() => setDeleting(null)}
            >
              Hủy
            </Button>
            <Button variant="destructive" disabled={removing} onClick={remove}>
              {removing ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
