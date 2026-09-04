"use client";

import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { productionWorkshopsService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import useSWR from "swr";
import HeaderListProductionWorkshop from "./header-list-production-workshop";
import ItemProductionWorkshop from "./item-production-workshop";

type ProductionWorkshopsListPageProps = {
  baseRoute?: string;
  title?: string;
};

export default function ProductionWorkshopsListPage({
  baseRoute = "/pressure-differentials",
  title = "Kiểm tra chênh áp",
}: ProductionWorkshopsListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const activeWorkshopId = pathname.startsWith(`${baseRoute}/`)
    ? decodeURIComponent(
        pathname.replace(`${baseRoute}/`, ""),
      )
    : null;

  const { data, error, isLoading } = useSWR(
    API_ROUTES.productionWorkshops.base,
    productionWorkshopsService.fetchProductionWorkshops,
  );

  const filteredWorkshops = useMemo(() => {
    return (data ?? [])
      .filter((workshop) =>
        matchesSearchKeyword(
          [
            workshop.id,
            workshop.code,
            workshop.name,
            workshop.description,
            workshop.address,
          ],
          searchKeyword,
        ),
      )
      .sort((first, second) => first.code.localeCompare(second.code));
  }, [data, searchKeyword]);

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: `productionWorkshopListScroll:${baseRoute}`,
    restoreSignal: `${filteredWorkshops.length}:${pathname}`,
  });

  const handleClick = (workshopId: string | number) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`${baseRoute}/${workshopId}`, {
      scroll: false,
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <HeaderListProductionWorkshop href={baseRoute} title={title} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách nhà xưởng.
          </p>
        ) : isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <ItemProductionWorkshop
              key={index}
              workshop={null}
              onClick={() => {}}
            />
          ))
        ) : filteredWorkshops.length > 0 ? (
          filteredWorkshops.map((workshop) => (
            <ItemProductionWorkshop
              key={workshop.id}
              workshop={workshop}
              isActive={activeWorkshopId === String(workshop.id)}
              onClick={() => handleClick(workshop.id)}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy nhà xưởng phù hợp."
              : "Chưa có nhà xưởng nào."}
          </p>
        )}
      </div>
    </div>
  );
}
