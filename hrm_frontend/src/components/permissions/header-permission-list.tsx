"use client";

import AddPermissionForm from "./form-add-permission";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import { permissionsService } from "@/services/index.service";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import { toast } from "sonner";
import { mutate } from "swr";

export default function PermissionListHeader() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleCreate = async (data: { name: string; description: string }) => {
    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập mã quyền.");
      return false;
    }

    try {
      await permissionsService.createPermission({
        name,
        description: data.description.trim(),
      });
      await mutate(API_ROUTES.permissions.base);
      toast.success("Đã tạo quyền.");
      return true;
    } catch {
      toast.error("Không thể tạo quyền.");
      return false;
    }
  };

  return (
    <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href="/setting">Phân quyền</Link>
      </div>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <PlusIcon />
            Thêm mới
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogTitle className="mb-4 text-center text-lg font-semibold">
            THÊM QUYỀN MỚI
          </DialogTitle>
          <AddPermissionForm
            onSubmit={handleCreate}
            onClose={() => setIsAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
