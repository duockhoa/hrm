"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-logout";
import { LogOut, User, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type UserCardProps = {
  user: any;
  variant?: "default" | "hero";
};

export default function UserCard({ user, variant = "default" }: UserCardProps) {
  const { logout } = useLogout();
  const router = useRouter();
  const isHero = variant === "hero";

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-full transition",
              isHero
                ? "px-2 py-1 hover:bg-white/10 focus-visible:bg-white/10"
                : "",
            )}
          >
            <div
              className={cn(
                "hidden flex-col md:flex",
                isHero ? "items-end text-right" : "",
              )}
            >
              {user ? (
                <>
                  <span
                    className={cn(
                      "font-bold",
                      isHero ? "text-sm font-semibold text-white" : "",
                    )}
                  >
                    {user?.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isHero ? "text-white/60" : "text-gray-500",
                    )}
                  >
                    {user?.position} {user?.department}
                  </span>
                </>
              ) : (
                <>
                  <Skeleton
                    className={cn("mb-1 h-4 w-24", isHero ? "bg-white/12" : "")}
                  />
                  <Skeleton
                    className={cn("h-4 w-24", isHero ? "bg-white/12" : "")}
                  />
                </>
              )}
            </div>
            <Avatar
              size={isHero ? "lg" : "default"}
              className={cn(
                isHero
                  ? "ring-2 ring-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                  : "",
              )}
            >
              {user ? (
                <AvatarImage
                  src={user?.avatar || "https://github.com/shadcn.png"}
                  alt={user?.name || "@shadcn"}
                />
              ) : (
                <AvatarFallback>
                  <Skeleton className="w-12 h-12 rounded-full" />
                </AvatarFallback>
              )}
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
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
              router.push("/");
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
