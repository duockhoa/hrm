"use client";
import { Button } from "@/components/ui/button";
import { AiOutlineRight } from "react-icons/ai";
import { LuX } from "react-icons/lu";
import { FaRegEdit } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EditUserForm from "../form-edit-user/form-edit-user";
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
export default function DetailUserHeader({ user }: { user: any }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2">
      <div className="flex items-center gap-2">
        <h1>Users</h1>
        <AiOutlineRight />
        <p>{user?.id}</p>
      </div>
      <div className="flex items-center gap-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button>
              <FaRegEdit />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <EditUserForm user={user} onClose={() => setIsEditOpen(false)} />
          </DialogContent>
        </Dialog>
        <div
          className="flex items-center gap-2"
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
