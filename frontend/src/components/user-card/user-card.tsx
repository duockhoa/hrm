"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-logout";
import { LogOut, User, Settings, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserCard({ user }: { user: any }) {
  const { logout } = useLogout();
  const router = useRouter();
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-bold">{user?.name}</span>
              <span className="text-gray-500 text-xs">
                {user?.position} {user?.department}
              </span>
            </div>
            <Avatar>
              <AvatarImage
                src={user?.avatar || "https://github.com/shadcn.png"}
                alt={user?.name || "@shadcn"}
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => {
              router.push("/setting");
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Cài đặt
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              router.push("/profile");
            }}
          >
            <User className="mr-2 h-4 w-4" />
            Hồ sơ cá nhân
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              router.push("/applications");
            }}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Tất cả ứng dụng
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
