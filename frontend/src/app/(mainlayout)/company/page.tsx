"use client";
import HeaderListCompany from "@/components/header-list-company/header-list-company";
import useCompanyStore from "@/store/companies.store";
import useSearchStore from "@/store/search.store";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import ItemCompany from "@/components/item-company/item-company";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

function CompanySkeletonList() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex cursor-pointer items-center gap-4 rounded-md border p-4 shadow-sm"
        >
          <Skeleton className="h-20 w-20 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Company() {
  const { companies, companiesLoading } = useCompanyStore();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore((state) =>
    state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const filteredCompanies = useMemo(() => {
    if (!searchKeyword) {
      return companies;
    }

    return companies.filter((company: any) =>
      matchesSearchKeyword(
        [
          company.name,
          company.description,
          company.address,
          company.phone,
          company.email,
        ],
        searchKeyword,
      ),
    );
  }, [companies, searchKeyword]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white p-4 shadow-md">
      <div className="shrink-0">
        <HeaderListCompany />
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {companiesLoading ? (
          <CompanySkeletonList />
        ) : filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company: any) => (
              <ItemCompany key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Khong tim thay cong ty phu hop."
              : "Chua co cong ty nao."}
          </p>
        )}
      </div>
    </div>
  );
}
