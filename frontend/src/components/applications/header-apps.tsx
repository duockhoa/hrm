"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import useSWR from "swr";
import Notification from "@/components/layout/notification";
import Search from "@/components/layout/search";
import UserCard from "@/components/users/user-card";
import { Input } from "@/components/ui/input";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";
import useUserStore from "@/store/user.store";

type HeaderAppsProps = {
  variant?: "default" | "hero";
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function HeaderApps({
  variant = "default",
  searchValue,
  onSearchChange,
}: HeaderAppsProps) {
  const { setUser } = useUserStore();
  const { data: user } = useSWR(API_ROUTES.users.me, userService.fetcherMe);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [setUser, user]);

  if (variant === "hero") {
    return (
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,19,44,0.56)_0%,rgba(5,19,44,0.2)_100%)] px-4 py-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center justify-between gap-3 md:min-w-0">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image
                src="/dkpharmalogo.png"
                alt="Logo"
                width={124}
                height={48}
                className="h-auto w-[110px] md:w-[124px]"
              />
              <div className="hidden min-[900px]:block">
                <p className="text-sm text-white/65">DK Pharma</p>
                <h1 className="text-xl font-semibold tracking-tight">
                  DK Quản Lý Tập Trung
                </h1>
              </div>
            </Link>

            <div className="md:hidden">
              <UserCard user={user} variant="hero" />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px] lg:w-[360px]">
              <Input
                type="text"
                placeholder="Tìm kiếm ứng dụng"
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange?.(event.target.value)}
                className="h-11 rounded-full border-white/20 bg-white/5 pr-10 text-white placeholder:text-white/50 focus-visible:border-sky-300/60 focus-visible:ring-sky-200/20"
              />
              <SearchIcon className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/60" />
            </div>

            <div className="hidden md:block">
              <UserCard user={user} variant="hero" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-[60px] items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/dkpharmalogo.png"
          alt="Logo"
          width={140}
          height={60}
          className="p-4"
        />
        <h1 className="hidden text-xl md:block">DKPharma APPs</h1>
      </Link>

      <div className="flex items-center gap-4">
        <Search />
        <Notification
          content={[
            {
              id: "1",
              title: "New Message",
              message: "You have received a new message.",
              from: "System",
              to: "User",
              link: "/messages/1",
              read: false,
              createdAt: new Date(),
            },
          ]}
        />

        <UserCard user={user} />
      </div>
    </header>
  );
}
