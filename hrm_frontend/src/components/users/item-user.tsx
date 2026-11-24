import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AiOutlineMore } from "react-icons/ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import FormConfirm from "@/components/common/form-confirm";
import { userService } from "@/services/index.service";
import { toast } from "sonner";
import {
  refreshUserDirectories,
  type DirectoryUser,
} from "@/hooks/use-user-directory";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import EditUserForm from "./form-edit-user";
import { cn } from "@/lib/utils";

export default function ItemUser({
  user,
  onClick,
  isActive = false,
}: {
  user: DirectoryUser | null;
  onClick: () => void;
  isActive?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const hasLeft = Boolean(user?.deleted_at);
  const canOpen = Boolean(user) && !hasLeft;
  const handleViewDetails = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!canOpen) {
      return;
    }
    onClick();
  };

  const handleDelete = async () => {
    try {
      if (!user || hasLeft) return;
      await userService.deleteUser(String(user.id));
      setIsOpen(false);
      toast.success("User deleted successfully!");
      void refreshUserDirectories();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user.");
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 rounded-md border border-transparent border-b-gray-200 p-2",
        canOpen && "cursor-pointer transition-colors hover:bg-gray-50",
        canOpen &&
          isActive &&
          "border-blue-200 bg-sky-100 text-blue-950 shadow-sm hover:bg-sky-100",
      )}
      aria-current={canOpen && isActive ? "page" : undefined}
      onClick={canOpen ? onClick : undefined}
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-bold">{user.name}</p>
              {hasLeft && (
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700"
                >
                  Đã nghỉ việc
                </Badge>
              )}
            </div>
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
        {canOpen && (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AiOutlineMore className="text-xl mx-2 text-gray-600 hover:text-gray-900" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleViewDetails}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsOpen(true)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {canOpen && isOpen && (
        <div onClick={(event) => event.stopPropagation()}>
          <FormConfirm
            message="Bạn chắc chắn muốn xoá người dùng này không?"
            onConfirm={handleDelete}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      )}

      {canOpen && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent
            className="max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <EditUserForm user={user} onClose={() => setIsEditOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
