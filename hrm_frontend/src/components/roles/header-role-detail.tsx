"use client";

import AddRoleForm from "./form-add-role";
import FormConfirm from "@/components/common/form-confirm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import { rolesService } from "@/services/index.service";
import type { Role } from "@/types/role";
import { Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import { toast } from "sonner";
import { mutate } from "swr";

export default function RoleDetailHeader({ role }: { role?: Role }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = async (data: { name: string; description: string }) => {
    if (!role) {
      return false;
    }
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
    if (!role) {
      return;
    }

    try {
      await rolesService.deleteRole(role.id);
      await mutate(API_ROUTES.roles.base);
      toast.success("Đã xóa vai trò.");
      router.push("/roles", { scroll: false });
    } catch {
      toast.error("Không thể xóa vai trò.");
    }
  };

  return (
    <>
      <div className="flex w-full justify-between border-b border-gray-200 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/roles">Vai trò</Link>
          <AiOutlineRight />
          <p className="truncate">{role?.name ?? "Đang tải..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="cursor-pointer"
            disabled={!role}
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil />
            Sửa
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={!role}
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 />
            Xóa
          </Button>
          <button
            type="button"
            aria-label="Đóng chi tiết vai trò"
            className="cursor-pointer p-1 text-gray-600 hover:text-gray-900"
            onClick={() => router.push("/roles", { scroll: false })}
          >
            <X />
          </button>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="mb-4 text-center text-lg font-semibold">
            SỬA VAI TRÒ
          </DialogTitle>
          {role && (
            <AddRoleForm
              key={role.id}
              initialData={role}
              submitLabel="Cập nhật"
              onSubmit={handleUpdate}
              onClose={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {isDeleteOpen && role && (
        <FormConfirm
          message={`Bạn chắc chắn muốn xóa vai trò ${role.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
