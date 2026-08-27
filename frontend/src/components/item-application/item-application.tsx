"use client";

import AddApplicationForm from "@/components/form-add-application/form-add-application";
import FormConfirm from "@/components/form-confirm/form-confirm";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_ROUTES } from "@/lib/api-routes";
import { cn } from "@/lib/utils";
import { applicationsService } from "@/services/index.service";
import type { Application } from "@/types/application";
import { AppWindow } from "lucide-react";
import { useState } from "react";
import { AiOutlineMore } from "react-icons/ai";
import { toast } from "sonner";
import { mutate } from "swr";

type ApplicationFormData = {
  key: string;
  name: string;
  description: string;
  default_order: string;
};

export default function ItemApplication({
  application,
  isActive = false,
  onClick,
}: {
  application: Application;
  isActive?: boolean;
  onClick: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = async (data: ApplicationFormData) => {
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
    try {
      await applicationsService.deleteApplication(application.id);
      await mutate(API_ROUTES.applications.base);
      setIsDeleteOpen(false);
      toast.success("Đã xóa ứng dụng.");
    } catch {
      toast.error("Không thể xóa ứng dụng.");
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-md border border-transparent border-b-gray-200 p-2 transition-colors hover:bg-gray-50",
          isActive &&
            "border-blue-200 bg-sky-100 text-blue-950 shadow-sm hover:bg-sky-100",
        )}
        aria-current={isActive ? "page" : undefined}
        onClick={onClick}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <AppWindow className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold">{application.name}</p>
            <p className="truncate text-sm text-gray-600">
              {application.key}
              {application.description ? ` - ${application.description}` : ""}
            </p>
          </div>
        </div>
        <div className="grow" />
        <div className="flex items-center gap-2">
          <Badge variant={application.is_active ? "default" : "secondary"}>
            {application.is_active ? "Hoạt động" : "Tạm khóa"}
          </Badge>
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Thao tác với ${application.name}`}
                  className="cursor-pointer p-2 text-xl text-gray-600 hover:text-gray-900"
                >
                  <AiOutlineMore />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onClick}>
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  Sửa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteOpen(true)}>
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="mb-4 text-center text-lg font-semibold">
            SỬA ỨNG DỤNG
          </DialogTitle>
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
        </DialogContent>
      </Dialog>

      {isDeleteOpen && (
        <FormConfirm
          message={`Bạn chắc chắn muốn xóa ứng dụng ${application.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
