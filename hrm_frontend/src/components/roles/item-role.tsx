"use client";

import AddRoleForm from "./form-add-role";
import FormConfirm from "@/components/common/form-confirm";
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
import { rolesService } from "@/services/index.service";
import type { Role } from "@/types/role";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AiOutlineMore } from "react-icons/ai";
import { toast } from "sonner";
import { mutate } from "swr";

export default function ItemRole({
  role,
  isActive = false,
  onClick,
}: {
  role: Role;
  isActive?: boolean;
  onClick: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = async (data: { name: string; description: string }) => {
    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên vai trò.");
      return false;
    }

    try {
      await rolesService.updateRole(role.id, {
        name,
        description: data.description.trim(),
      });
      await Promise.all([
        mutate(API_ROUTES.roles.base),
        mutate(`${API_ROUTES.roles.base}/${role.id}`),
      ]);
      toast.success("Đã cập nhật vai trò.");
      return true;
    } catch {
      toast.error("Không thể cập nhật vai trò.");
      return false;
    }
  };

  const handleDelete = async () => {
    try {
      await rolesService.deleteRole(role.id);
      await mutate(API_ROUTES.roles.base);
      setIsDeleteOpen(false);
      toast.success("Đã xóa vai trò.");
    } catch {
      toast.error("Không thể xóa vai trò.");
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
            <ShieldCheck className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold">{role.name}</p>
            <p className="truncate text-sm text-gray-600">
              {role.description || "Chưa có mô tả"}
            </p>
          </div>
        </div>
        <div className="grow" />
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {role.rolePermissions?.length ?? 0} quyền
          </Badge>
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Thao tác với vai trò ${role.name}`}
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
            SỬA VAI TRÒ
          </DialogTitle>
          <AddRoleForm
            key={role.id}
            initialData={role}
            submitLabel="Cập nhật"
            onSubmit={handleUpdate}
            onClose={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {isDeleteOpen && (
        <FormConfirm
          message={`Bạn chắc chắn muốn xóa vai trò ${role.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
