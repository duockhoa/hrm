"use client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import useUserStore from "@/store/user.store";
import { FaPen } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";
import { mutate } from "swr";

export default function UpdateAvatar() {
  const { user } = useUserStore();
  const uploadAvatar = async (file: File) => {
    try {
      await userService.uploadAvatar(file);
      mutate(API_ROUTES.users.me);
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
  };
  return (
    <div className="relative">
      <Avatar className="size-60">
        <AvatarImage
          src={user?.avatar || "/default-avatar.png"}
          alt={user?.name || "User Avatar"}
        />
        <AvatarFallback>
          {user?.name ? user.name.charAt(0) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="bg-blue-500 size-12 rounded-full flex items-center justify-center text-white absolute bottom-2 right-2 cursor-pointer hover:bg-blue-600">
        <FaPen className=" size-4 " />
        <Input
          type="file"
          className="opacity-0 absolute top-0 left-0 w-full h-full cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadAvatar(file);
            }
          }}
        />
      </div>
    </div>
  );
}
