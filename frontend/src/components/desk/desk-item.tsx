import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AiOutlineMore } from "react-icons/ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import FormConfirm from "../form-confirm/form-confirm";
import { userService } from "@/services/index.service";
import { toast } from "sonner";
import { mutate } from "swr";
import { API_ROUTES } from "@/lib/api-routes";

export default function DeskItem({
  user,
  onClick,
}: {
  user: any;
  onClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const handleDelete = async () => {
    try {
      await userService.deleteUser(user?.id || "");
      toast.success("User deleted successfully!");
      mutate(API_ROUTES.users.base);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user.");
    }
  };

  return (
    <div
      className={`flex gap-2 border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {!user ? (
          <Skeleton className="w-12 h-12 rounded-full" />
        ) : (
          <Avatar>
            <AvatarImage
              src={user.avatar || "https://github.com/shadcn.png"}
              alt={user.name || "@shadcn"}
            />
          </Avatar>
        )}
        <div>
          {!user ? (
            <Skeleton className="w-32 h-4 mb-1" />
          ) : (
            <p className="font-bold">{user.name}</p>
          )}
          {!user ? (
            <Skeleton className="w-32 h-4 mb-1" />
          ) : (
            <p>
              {user.position} - {user.department}
            </p>
          )}
        </div>
      </div>
      <div className="grow-1"></div>
      <div className="flex items-center gap-2">
        {!user ? <Skeleton className="w-4 h-4" /> : <p>{user.department}</p>}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AiOutlineMore className="text-xl mx-2 text-gray-600 hover:text-gray-900" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onClick}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isOpen && (
        <div className="">
          <FormConfirm
            message="Bạn chắc chắn muốn xoá người dùng này không?"
            onConfirm={handleDelete}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
