"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import { RefreshCw } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { useInfiniteItemCatalog } from "@/hooks/use-infinite-item-catalog";
import { useSkeletonRowCount } from "@/hooks/use-skeleton-row-count";
import { API_ROUTES } from "@/lib/api-routes";
import { refreshItemCatalog } from "@/lib/item-catalog-refresh";
import { getSearchScopePath } from "@/lib/search-utils";
import itemsService from "@/services/items.service";
import userService from "@/services/user.service";
import useSearchStore from "@/store/search.store";
import ItemRow from "./item-row";

export default function ItemsPage() {
  const skeletonRows = useSkeletonRowCount(100);
  const router = useRouter();
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: user } = useSWR(API_ROUTES.users.me, userService.fetcherMe);
  const { data: permissions, error: permissionError } = useSWR(
    user?.id ? [API_ROUTES.users.myPermissions, user.id] : null,
    userService.fetchMyPermissions,
  );
  const canSync =
    !permissionError && permissions?.permissionKeys.includes("items.update");
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const activeItemCode = pathname.startsWith("/items/")
    ? decodeURIComponent(pathname.slice("/items/".length))
    : null;
  const {
    items: filteredItems,
    error,
    hasMore,
    isInitialLoading: isLoading,
    isLoadingMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    saveScrollPosition,
  } = useInfiniteItemCatalog(API_ROUTES.items.rawMaterials, "itemsListScroll");

  const syncItems = async () => {
    if (!canSync || isSyncing) return;
    setIsSyncing(true);
    try {
      const { created, updated, skipped, failed } =
        await itemsService.syncFromSap();
      const changes = `Thêm ${created}, cập nhật ${updated} mặt hàng.`;
      if (skipped || failed) {
        toast.warning(
          `Đã đồng bộ SAP. ${changes} Bỏ qua ${skipped}, lỗi ${failed}.`,
        );
      } else {
        toast.success(`Đã đồng bộ SAP. ${changes}`);
      }
      await refreshItemCatalog(API_ROUTES.items.rawMaterials).catch(() => {
        toast.error(
          "Đã đồng bộ SAP nhưng chưa tải lại được danh sách nguyên liệu.",
        );
      });
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        message || "Không nhận được kết quả đồng bộ SAP. Vui lòng thử lại.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <div className="flex w-full items-center gap-2 border-b border-gray-200 pb-2">
          <AiOutlineRight />
          <Link href="/items">Danh sách nguyên liệu</Link>
          {canSync && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={isSyncing}
              aria-busy={isSyncing}
              aria-label="SAP – Đồng bộ danh mục mặt hàng"
              onClick={() => void syncItems()}
            >
              <RefreshCw
                aria-hidden="true"
                className={isSyncing ? "size-4 animate-spin" : "size-4"}
              />
              SAP
            </Button>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isLoading ? (
          Array.from({ length: skeletonRows }, (_, index) => (
            <ItemRow key={index} item={null} />
          ))
        ) : filteredItems.length ? (
          filteredItems.map((item) => (
            <ItemRow
              key={item.item_code}
              item={item}
              isActive={activeItemCode === item.item_code}
              onClick={() => {
                saveScrollPosition({ restoreOnNextFrame: true });
                router.push(`/items/${encodeURIComponent(item.item_code)}`, {
                  scroll: false,
                });
              }}
            />
          ))
        ) : !error ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {searchKeyword.trim()
              ? "Không tìm thấy nguyên liệu phù hợp."
              : "Chưa có nguyên liệu nào."}
          </p>
        ) : null}
        <InfiniteRecordLoadStatus
          sentinelRef={sentinelRef}
          count={filteredItems.length}
          error={error}
          loading={isLoadingMore}
          hasMore={hasMore}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
