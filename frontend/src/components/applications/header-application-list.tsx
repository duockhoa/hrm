"use client";

import AddApplicationForm from "./form-add-application";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import { applicationsService } from "@/services/index.service";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
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

export default function ApplicationListHeader() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleCreate = async (data: ApplicationFormData) => {
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
      await applicationsService.createApplication({
        key: data.key.trim(),
        name: data.name.trim(),
        description: data.description.trim(),
        default_order: defaultOrder,
        is_active: true,
      });
      await mutate(API_ROUTES.applications.base);
      toast.success("Đã thêm ứng dụng.");
      return true;
    } catch {
      toast.error("Không thể thêm ứng dụng.");
      return false;
    }
  };

  return (
    <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href="/applications">Ứng dụng</Link>
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
            THÊM ỨNG DỤNG MỚI
          </DialogTitle>
          <AddApplicationForm
            onSubmit={handleCreate}
            onClose={() => setIsAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
