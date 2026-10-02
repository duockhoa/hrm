"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import itemsService from "@/services/items.service";
import useSearchStore from "@/store/search.store";
import ItemRow from "./item-row";
import type { Item } from "./types";

const collator = new Intl.Collator("vi-VN", { numeric: true, sensitivity: "base" });

export default function ItemsPage() {
  const { data, error, isLoading, mutate } = useSWR<Item[]>(
    API_ROUTES.items.rawMaterials,
    itemsService.fetchRawMaterials,
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore((state) => state.searchByPath[searchScopePath] ?? "");
  const activeItemCode = pathname.startsWith("/items/")
    ? decodeURIComponent(pathname.slice("/items/".length))
    : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredItems = useMemo(
    () => (data ?? [])
      .filter((item) => matchesSearchKeyword([item.item_code, item.item_name, item.dk_code], searchKeyword))
      .sort((first, second) => collator.compare(second.item_code, first.item_code)),
    [data, searchKeyword],
  );
  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "itemsListScroll",
    restoreSignal: `${filteredItems.length}:${pathname}`,
  });

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <div className="flex w-full items-center gap-2 border-b border-gray-200 pb-2">
          <AiOutlineRight />
          <Link href="/items">Danh sách nguyên liệu</Link>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isLoading ? (
          Array.from({ length: 10 }, (_, index) => <ItemRow key={index} item={null} />)
        ) : error ? (
          <div role="alert" className="p-4 text-center text-sm text-red-600">
            <p>Không thể tải danh sách nguyên liệu.</p>
            <Button variant="outline" className="mt-2" onClick={() => void mutate()}>Thử lại</Button>
          </div>
        ) : filteredItems.length ? (
          filteredItems.map((item) => (
            <ItemRow
              key={item.item_code}
              item={item}
              isActive={activeItemCode === item.item_code}
              onClick={() => {
                saveScrollPosition({ restoreOnNextFrame: true });
                router.push(`/items/${encodeURIComponent(item.item_code)}`, { scroll: false });
              }}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {searchKeyword.trim() ? "Không tìm thấy hàng hóa phù hợp." : "Chưa có hàng hóa nào."}
          </p>
        )}
      </div>
    </div>
  );
}
