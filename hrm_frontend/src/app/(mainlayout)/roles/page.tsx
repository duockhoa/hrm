"use client";

import RoleListHeader from "@/components/roles/header-role-list";
import ItemRole from "@/components/roles/item-role";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import {
  restoreScrollableChainPosition,
  saveScrollableChainPosition,
} from "@/lib/scroll-position";
import { rolesService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import type { Role } from "@/types/role";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

const ROLE_LIST_SCROLL_KEY = "roleListScroll";

export default function RolesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRoleId = pathname.startsWith("/roles/")
    ? pathname.split("/")[2]
    : null;
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const { data: roles = [], isLoading } = useSWR<Role[]>(
    API_ROUTES.roles.base,
    rolesService.fetcherRoles,
  );
  const filteredRoles = useMemo(
    () =>
      roles.filter((role) =>
        matchesSearchKeyword(
          [role.id, role.name, role.description],
          searchKeyword,
        ),
      ),
    [roles, searchKeyword],
  );

  useEffect(() => {
    restoreScrollableChainPosition(ROLE_LIST_SCROLL_KEY, containerRef.current);
  }, [filteredRoles.length, isLoading]);

  const openDetail = (roleId: number) => {
    saveScrollableChainPosition(ROLE_LIST_SCROLL_KEY, containerRef.current);
    router.push(`/roles/${roleId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <RoleListHeader />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2 pt-0">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-gray-200 p-2"
            >
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))
        ) : filteredRoles.length > 0 ? (
          filteredRoles.map((role) => (
            <ItemRole
              key={role.id}
              role={role}
              isActive={String(role.id) === activeRoleId}
              onClick={() => openDetail(role.id)}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {searchKeyword.trim()
              ? "Không tìm thấy vai trò phù hợp."
              : "Chưa có vai trò nào."}
          </p>
        )}
      </div>
    </div>
  );
}
