"use client";

import { ItemRawMaterial, ListRawMaterialHeader } from "@/features/raw-materials";
import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { sortByItemCodeDesc } from "@/lib/item-sort";
import { getSearchScopePath } from "@/lib/search-utils";
import { itemsService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import useSWR from "swr";

export default function RawMaterialsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  ).trim();
  const isSearching = searchKeyword.length > 0;
  const { data, error, isLoading, mutate } = useSWR(
    isSearching
      ? [API_ROUTES.items.rawMaterials, searchKeyword]
      : API_ROUTES.items.rawMaterials,
    () => itemsService.fetchRawMaterials(searchKeyword),
  );
  const activeRawMaterialId = pathname.startsWith("/raw-materials/")
    ? decodeURIComponent(pathname.replace("/raw-materials/", ""))
    : null;
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredRawMaterials = useMemo(
    () => sortByItemCodeDesc(data ?? []),
    [data],
  );

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "rawMaterialListScroll",
    restoreSignal: `${filteredRawMaterials.length}:${pathname}`,
  });

  const handleClick = (rawMaterialId: string) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/raw-materials/${rawMaterialId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <ListRawMaterialHeader />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <div role="alert" className="p-4 text-center text-sm text-red-600">
            Không thể tải danh mục nguyên liệu.
            <Button type="button" variant="link" onClick={() => void mutate()}>
              Thử lại
            </Button>
          </div>
        ) : isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <ItemRawMaterial
              key={index}
              rawMaterial={null}
              onClick={() => {}}
            />
          ))
        ) : filteredRawMaterials.length > 0 ? (
          filteredRawMaterials.map((rawMaterial) => (
            <ItemRawMaterial
              key={rawMaterial.item_code}
              rawMaterial={rawMaterial}
              isActive={activeRawMaterialId === rawMaterial.item_code}
              onClick={() => handleClick(rawMaterial.item_code)}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy nguyên liệu phù hợp."
              : "Chưa có nguyên liệu nào."}
          </p>
        )}
      </div>
    </div>
  );
}
