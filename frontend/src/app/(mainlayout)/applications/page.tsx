"use client";

import ApplicationListHeader from "@/components/header-application-list/header-application-list";
import ItemApplication from "@/components/item-application/item-application";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import {
  restoreScrollableChainPosition,
  saveScrollableChainPosition,
} from "@/lib/scroll-position";
import { applicationsService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import type { Application } from "@/types/application";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

const APPLICATION_LIST_SCROLL_KEY = "applicationListScroll";

export default function ApplicationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeApplicationId = pathname.startsWith("/applications/")
    ? pathname.split("/")[2]
    : null;
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const { data: applications = [], isLoading } = useSWR<Application[]>(
    API_ROUTES.applications.base,
    () => applicationsService.fetcherApplications(true),
  );
  const filteredApplications = useMemo(
    () =>
      applications.filter((application) =>
        matchesSearchKeyword(
          [
            application.id,
            application.key,
            application.name,
            application.description,
            application.is_active ? "hoạt động" : "tạm khóa",
          ],
          searchKeyword,
        ),
      ),
    [applications, searchKeyword],
  );

  useEffect(() => {
    restoreScrollableChainPosition(
      APPLICATION_LIST_SCROLL_KEY,
      containerRef.current,
    );
  }, [filteredApplications.length, isLoading]);

  const openDetail = (applicationId: number) => {
    saveScrollableChainPosition(
      APPLICATION_LIST_SCROLL_KEY,
      containerRef.current,
    );
    router.push(`/applications/${applicationId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <ApplicationListHeader />
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
        ) : filteredApplications.length > 0 ? (
          filteredApplications.map((application) => (
            <ItemApplication
              key={application.id}
              application={application}
              isActive={String(application.id) === activeApplicationId}
              onClick={() => openDetail(application.id)}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {searchKeyword.trim()
              ? "Không tìm thấy ứng dụng phù hợp."
              : "Chưa có ứng dụng nào."}
          </p>
        )}
      </div>
    </div>
  );
}
