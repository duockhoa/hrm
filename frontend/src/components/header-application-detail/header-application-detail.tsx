"use client";

import AddApplicationForm from "@/components/form-add-application/form-add-application";
import FormConfirm from "@/components/form-confirm/form-confirm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import { applicationsService } from "@/services/index.service";
import type { Application } from "@/types/application";
import { Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import { toast } from "sonner";
import { mutate } from "swr";

type ApplicationFormData = {
  key: string;
  name: string;
  description: string;
  default_order: string;
};

export default function ApplicationDetailHeader({
  application,
}: {
  application?: Application;
}) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = async (data: ApplicationFormData) => {
    if (!application) {
      return false;
    }
    const defaultOrder = Number(data.default_order || 0);
    if (!data.key.trim() || !data.name.trim()) {
      toast.error("Vui lòng nhập key và tên ứng dụng.");
      return false;
    }
    if (!Number.isInteger(defaultOrder)) {
      toast.error("Thứ tự phải là số nguyên.");
      return false;
    }

    try {
      await applicationsService.updateApplication(application.id, {
        key: data.key.trim(),
        name: data.name.trim(),
        description: data.description.trim(),
        default_order: defaultOrder,
      });
      await Promise.all([
        mutate(API_ROUTES.applications.base),
        mutate(`${API_ROUTES.applications.base}/${application.id}`),
      ]);
      toast.success("Đã cập nhật ứng dụng.");
      return true;
    } catch {
      toast.error("Không thể cập nhật ứng dụng.");
      return false;
    }
  };

  const handleDelete = async () => {
    if (!application) {
      return;
    }

    try {
      await applicationsService.deleteApplication(application.id);
      await mutate(API_ROUTES.applications.base);
      toast.success("Đã xóa ứng dụng.");
      router.push("/applications", { scroll: false });
    } catch {
      toast.error("Không thể xóa ứng dụng.");
    }
  };

  return (
    <>
      <div className="flex w-full justify-between border-b border-gray-200 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/applications">Ứng dụng</Link>
          <AiOutlineRight />
          <p className="truncate">{application?.name ?? "Đang tải..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="cursor-pointer"
            disabled={!application}
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil />
            Sửa
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={!application}
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 />
            Xóa
          </Button>
          <button
            type="button"
            aria-label="Đóng chi tiết ứng dụng"
            className="cursor-pointer p-1 text-gray-600 hover:text-gray-900"
            onClick={() => router.push("/applications", { scroll: false })}
          >
            <X />
          </button>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="mb-4 text-center text-lg font-semibold">
            SỬA ỨNG DỤNG
          </DialogTitle>
          {application && (
            <AddApplicationForm
              key={application.id}
              initialData={{
                key: application.key,
                name: application.name,
                description: application.description ?? "",
                default_order: String(application.default_order),
              }}
              submitLabel="Cập nhật"
              onSubmit={handleUpdate}
              onClose={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {isDeleteOpen && application && (
        <FormConfirm
          message={`Bạn chắc chắn muốn xóa ứng dụng ${application.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
