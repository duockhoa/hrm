"use client";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FilterCatalog } from "@/features/filter-catalogs";
import FilterCatalogDetail from "@/features/filter-catalogs/components/filter-catalog-detail";
import {
  getRemainingFilterCatalogUsageCount,
  isFilterCatalogExpired,
} from "@/features/filter-catalogs/utils";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import filterCatalogsService from "@/services/filter-catalogs.service";
import useSearchStore from "@/store/search.store";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";

const FILTER_USAGE_RECORDS_ROUTE = "/filter-usage-records";

const groupFilterCatalogsByUsageStatus = (filterCatalogs: FilterCatalog[]) => {
  const activeFilterCatalogs = filterCatalogs.filter(
    (filterCatalog) => !isFilterCatalogExpired(filterCatalog),
  );
  const expiredFilterCatalogs = filterCatalogs.filter(isFilterCatalogExpired);

  return [
    {
      key: "active",
      label: "Còn hạn dùng",
      filterCatalogs: activeFilterCatalogs,
    },
    {
      key: "expired",
      label: "Hết hạn dùng",
      filterCatalogs: expiredFilterCatalogs,
    },
  ].filter((group) => group.filterCatalogs.length > 0);
};

function FilterCatalogTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: 6 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className="border-r px-3">
              <Skeleton className="h-4 w-full min-w-16" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyDetailState() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500">
      Chọn một cột lọc trong bảng để xem chi tiết và lịch sử sử dụng.
    </div>
  );
}

export default function FilterUsageRecordsPage() {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [selectedFilterCatalogId, setSelectedFilterCatalogId] = useState<
    number | null
  >(null);
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const { data, error, isLoading } = useSWR<FilterCatalog[]>(
    API_ROUTES.filterCatalogs.base,
    filterCatalogsService.fetchFilterCatalogs,
  );

  const filterCatalogs = useMemo(() => data ?? [], [data]);
  const filteredFilterCatalogs = useMemo(() => {
    if (!searchKeyword) {
      return filterCatalogs;
    }

    return filterCatalogs.filter((filterCatalog) =>
      matchesSearchKeyword(
        [
          filterCatalog.id,
          filterCatalog.filter_code,
          filterCatalog.filter_type,
          filterCatalog.usable_steam_cycles,
          filterCatalog.production_order_filtration_checks_count,
          filterCatalog.pre_filter_sensory_requirement,
          filterCatalog.post_filter_sensory_requirement,
          filterCatalog.integrity_requirement,
          filterCatalog.description,
        ],
        searchKeyword,
      ),
    );
  }, [filterCatalogs, searchKeyword]);
  const groupedFilterCatalogs = useMemo(
    () => groupFilterCatalogsByUsageStatus(filteredFilterCatalogs),
    [filteredFilterCatalogs],
  );

  const selectedFilterCatalog = useMemo(
    () =>
      filterCatalogs.find(
        (filterCatalog) => filterCatalog.id === selectedFilterCatalogId,
      ),
    [filterCatalogs, selectedFilterCatalogId],
  );
  const selectedFilterCatalogExists = filteredFilterCatalogs.some(
    (filterCatalog) => filterCatalog.id === selectedFilterCatalogId,
  );
  const shouldShowMobileDetail =
    isMobile && selectedFilterCatalogId !== null && selectedFilterCatalogExists;
  const selectedFilterCatalogTitle = selectedFilterCatalog
    ? [selectedFilterCatalog.filter_code, selectedFilterCatalog.filter_type]
        .filter(Boolean)
        .join(" - ")
    : "";

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href={FILTER_USAGE_RECORDS_ROUTE}>
              Sổ theo dõi sử dụng cột lọc
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        {error ? (
          <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải sổ theo dõi sử dụng cột lọc.
          </div>
        ) : (
          <table className="w-full min-w-[1080px] caption-bottom border-t text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-44 border-r px-3 font-bold text-gray-900">
                  Mã cột lọc
                </TableHead>
                <TableHead className="w-44 border-r px-3 font-bold text-gray-900">
                  Loại lọc
                </TableHead>
                <TableHead className="w-48 border-r px-3 text-right font-bold text-gray-900">
                  Số lần hấp cho phép
                </TableHead>
                <TableHead className="w-40 border-r px-3 text-right font-bold text-gray-900">
                  Số lần sử dụng
                </TableHead>
                <TableHead className="w-44 border-r px-3 text-right font-bold text-gray-900">
                  Hạn dùng còn lại
                </TableHead>
                <TableHead className="px-3 font-bold text-gray-900">
                  Mô tả
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilterCatalogTableSkeleton />
              ) : groupedFilterCatalogs.length > 0 ? (
                groupedFilterCatalogs.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell
                        colSpan={6}
                        className="border-r px-3 font-semibold text-gray-900"
                      >
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {group.filterCatalogs.map((filterCatalog) => {
                      const isSelected =
                        filterCatalog.id === selectedFilterCatalogId;

                      return (
                        <TableRow
                          key={filterCatalog.id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          data-state={isSelected ? "selected" : undefined}
                          className={`cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setSelectedFilterCatalogId(filterCatalog.id)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedFilterCatalogId(filterCatalog.id);
                            }
                          }}
                        >
                          <TableCell className="border-r px-3 font-mono text-xs font-medium text-gray-900">
                            {filterCatalog.filter_code}
                          </TableCell>
                          <TableCell className="border-r px-3 font-medium text-gray-900">
                            {filterCatalog.filter_type}
                          </TableCell>
                          <TableCell className="border-r px-3 text-right">
                            {filterCatalog.usable_steam_cycles ?? ""}
                          </TableCell>
                          <TableCell className="border-r px-3 text-right">
                            {filterCatalog.production_order_filtration_checks_count ??
                              0}
                          </TableCell>
                          <TableCell className="border-r px-3 text-right">
                            {getRemainingFilterCatalogUsageCount(filterCatalog) ??
                              ""}
                          </TableCell>
                          <TableCell className="max-w-[440px] whitespace-normal break-words px-3">
                            {filterCatalog.description ?? ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    {isSearching
                      ? "Không tìm thấy cột lọc phù hợp."
                      : "Chưa có cột lọc nào."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        )}
      </div>
    </div>
  );

  const detailPanel = selectedFilterCatalogId ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="shrink-0"
              href={FILTER_USAGE_RECORDS_ROUTE}
              onClick={() => setSelectedFilterCatalogId(null)}
            >
              Sổ theo dõi cột lọc
            </Link>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{selectedFilterCatalogTitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => setSelectedFilterCatalogId(null)}
            aria-label="Thoát chi tiết"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-2 md:p-4">
        <FilterCatalogDetail
          id={selectedFilterCatalogId}
          onClose={() => setSelectedFilterCatalogId(null)}
        />
      </div>
    </div>
  ) : (
    <EmptyDetailState />
  );

  if (shouldShowMobileDetail) {
    return <div className="h-full overflow-auto">{detailPanel}</div>;
  }

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        <ResizablePanel
          defaultSize={selectedFilterCatalogExists ? 40 : 100}
          minSize={35}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {listPanel}
        </ResizablePanel>
        {selectedFilterCatalogExists ? (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={60}
              minSize={30}
              className="min-h-0 min-w-0 overflow-auto bg-blue-50"
            >
              {detailPanel}
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
