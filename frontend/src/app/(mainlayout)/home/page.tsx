"use client";
import useUsersStore from "@/store/users.store";
import DeskItem from "@/components/desk/desk-item";
import ListUserHeader from "@/components/list-user-header/list-user-header";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";

export default function HomePage() {
  const { users, usersLoading } = useUsersStore();

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Lưu scroll position trước khi chuyển trang
  const handleClick = (userId: string) => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    sessionStorage.setItem("userListScroll", scrollTop.toString());
    router.push(`/home/${userId}`, { scroll: false });
  };

  // Khôi phục scroll position sau khi render
  useEffect(() => {
    const scrollTop = sessionStorage.getItem("userListScroll");
    if (scrollTop && containerRef.current) {
      containerRef.current.scrollTop = parseInt(scrollTop, 10);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-white h-[100%] rounded-lg shadow-md overflow-auto"
    >
      <div className="w-full sticky top-0 z-10 bg-white p-2">
        <ListUserHeader />
      </div>
      <div className="flex-1 flex flex-col p-2 pt-0 gap-2">
        {usersLoading
          ? Array.from({ length: 10 }).map((_, idx) => (
              <DeskItem key={idx} user={null} onClick={() => {}} />
            ))
          : users.map((user) => (
              <DeskItem
                key={user.id}
                user={user}
                onClick={() => handleClick(user.id)}
              />
            ))}
      </div>
    </div>
  );
}
