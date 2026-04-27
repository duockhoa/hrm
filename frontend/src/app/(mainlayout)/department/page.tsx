"use client";
import HeaderListDepartment from "@/components/header-department-list/header-list-department";
import useDepartmentStore from "@/store/department.store";
import useSearchStore from "@/store/search.store";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import ItemDepartment from "@/components/item-department/item-department";

function DepartmentSkeletonList() {
  return (
    <div className="flex flex-row flex-wrap gap-4 content-start">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="w-120 rounded-md border border-gray-300 bg-white p-4 shadow-md"
        >
          <div className="flex justify-between p-2">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-6" />
          </div>
          <div className="space-y-2 p-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="my-2 border-t border-gray-300" />
          <div className="space-y-3 bg-gray-50 p-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DepartmentPage() {
  const { departments, departmentsLoading } = useDepartmentStore();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore((state) =>
    state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const filteredDepartments = useMemo(() => {
    if (!searchKeyword) {
      return departments;
    }

    return departments.filter((department) =>
      matchesSearchKeyword(
        [
          department.name,
          department.description,
          department.company?.name,
          department.team_lead_user?.name,
        ],
        searchKeyword,
      ),
    );
  }, [departments, searchKeyword]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white p-4 shadow-md">
      <div className="shrink-0">
        <HeaderListDepartment />
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {departmentsLoading ? (
          <DepartmentSkeletonList />
        ) : filteredDepartments.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-4 content-start">
            {filteredDepartments.map((dept) => (
              <ItemDepartment key={dept.name} department={dept} />
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Khong tim thay phong ban phu hop."
              : "Chua co phong ban nao."}
          </p>
        )}
      </div>
    </div>
  );
}
