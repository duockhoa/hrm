"use client";
import FormConfirm from "@/components/common/form-confirm";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";
import { Trash2 } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import { LuX } from "react-icons/lu";
import { FaRegEdit } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EditUserForm from "./form-edit-user";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { mutate } from "swr";
export default function DetailUserHeader({ user }: { user: any }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (!user?.id) {
      return;
    }

    try {
      await userService.deleteUser(String(user.id));
      await mutate(API_ROUTES.users.base);
      toast.success("Đã xóa người dùng.");
      setIsDeleteOpen(false);
      router.push("/home", { scroll: false });
    } catch {
      toast.error("Không thể xóa người dùng.");
    }
  };

  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2">
      <div className="flex items-center gap-2">
        <Link href="/home">Users</Link>
        <AiOutlineRight />
        <p>{user?.id}</p>
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
            <EditUserForm user={user} onClose={() => setIsEditOpen(false)} />
          </DialogContent>
        </Dialog>
        <Button
          variant="destructive"
          className="cursor-pointer"
          disabled={!user?.id}
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 />
          Xóa
        </Button>
        <div
          className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
          onClick={() => {
            router.push("/home", { scroll: false });
          }}
        >
          <LuX />
        </div>
      </div>
      {isDeleteOpen && user?.id && (
        <FormConfirm
          message={`Bạn chắc chắn muốn xóa người dùng ${user.name || user.username || user.id}?`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </div>
  );
}
