"use client";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import AddDepartmentForm from "../form-add-department/form-add-department";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
export default function HeaderListDepartment() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2 bg-white">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <h1>Departments</h1>
      </div>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <PlusIcon />
            Add new
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-lg font-semibold mb-4 text-center">
            THÊM PHÒNG BAN MỚI
          </DialogTitle>
          <AddDepartmentForm onClose={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
