"use client";
import Image from "next/image";
import UserCard from "../user-card/user-card";
import Notification from "../notification/notification";
import Search from "../search/search";
import axiosClient from "@/lib/axios-client";
import useSWR from "swr";
import { useSidebarStore } from "@/store/sidebar-store";
import { MdDehaze } from "react-icons/md";
import useUserStore from "@/store/user.store";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";
import { useEffect } from "react";

export default function Header() {
  const { toggleSidebar } = useSidebarStore();
  const { setUser } = useUserStore();
  const {
    data: user,
    error,
    isLoading,
  } = useSWR(API_ROUTES.users.me, userService.fetcherMe);
  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user]);

  return (
    <header className="flex items-center justify-between p-2 bg-white px-4 border-b border-gray-200 h-[60px]">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <MdDehaze size={22} />
        </button>
        <Image
          src={"/dkpharmalogo.png"}
          alt="Logo"
          width={140}
          height={60}
          className="p-4"
        />
        <h1 className="text-xl hidden md:block">Nhân Sự Dược Khoa</h1>
      </div>

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
