"use client";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import AddUserForm from "../form-add-user/form-add-user";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
export default function ListUserHeader() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2 bg-white">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <h1>Home</h1>
      </div>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon />
            Add new
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-lg font-semibold mb-4 text-center">
            THÊM NHÂN SỰ MỚI
          </DialogTitle>
          <AddUserForm onClose={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
