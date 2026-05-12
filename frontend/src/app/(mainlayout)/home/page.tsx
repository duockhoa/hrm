"use client";
import useUsersStore from "@/store/users.store";
import useSearchStore from "@/store/search.store";
import ItemUser from "@/components/item-user/item-user";
import ListUserHeader from "@/components/header-list-user/header-list-user";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import {
  restoreScrollableChainPosition,
  saveScrollableChainPosition,
} from "@/lib/scroll-position";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useMemo } from "react";

const USER_LIST_SCROLL_KEY = "userListScroll";

export default function HomePage() {
  const { users, usersLoading } = useUsersStore();

  const router = useRouter();
  const pathname = usePathname();
  const activeUserId = pathname.startsWith("/home/")
    ? pathname.split("/")[2]
    : null;
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore((state) =>
    state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredUsers = useMemo(() => {
    if (!searchKeyword) {
      return users;
    }

    return users.filter((user) =>
      matchesSearchKeyword(
        [user.name, user.position, user.department, user.email, user.phone],
        searchKeyword,
      ),
    );
  }, [users, searchKeyword]);

  // Lưu scroll position trước khi chuyển trang
  const handleClick = (userId: string) => {
    saveScrollableChainPosition(USER_LIST_SCROLL_KEY, containerRef.current);
    router.push(`/home/${userId}`, { scroll: false });
  };

  // Khôi phục scroll position sau khi render
  useEffect(() => {
    restoreScrollableChainPosition(USER_LIST_SCROLL_KEY, containerRef.current);
  }, [filteredUsers.length, usersLoading]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-white h-[100%] rounded-lg shadow-md overflow-auto"
    >
      <div className="w-full sticky top-0 z-10 bg-white p-2">
        <ListUserHeader />
      </div>
      <div className="flex-1 flex flex-col p-2 pt-0 gap-2">
        {usersLoading ? (
          Array.from({ length: 10 }).map((_, idx) => (
            <ItemUser key={idx} user={null} onClick={() => {}} />
          ))
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
              <ItemUser
                key={user.id}
                user={user}
                isActive={String(user.id) === activeUserId}
                onClick={() => handleClick(user.id)}
              />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Khong tim thay nhan su phu hop."
              : "Chua co nhan su nao."}
          </p>
        )}
      </div>
    </div>
  );
}
