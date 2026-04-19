"use client";
import { Button } from "@/components/ui/button";
import { AiOutlineRight } from "react-icons/ai";
import { LuX } from "react-icons/lu";
import { FaRegEdit } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EditDepartmentForm from "../form-edit-department/form-edit-department";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export default function DetailDepartmentHeader({
  department,
}: {
  department: any;
}) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2">
      <div className="flex items-center gap-2">
        <h1>Departments</h1>
        <AiOutlineRight />
        <p>{department?.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer">
              <FaRegEdit />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <EditDepartmentForm
              department={department}
              onClose={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <div
          className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
          onClick={() => {
            router.push("/home", { scroll: false });
          }}
        >
          <LuX />
        </div>
      </div>
    </div>
  );
}
