"use client";
import { SearchIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Input } from "@/components/ui/input";
import { getSearchScopePath } from "@/lib/search-utils";
import useSearchStore from "@/store/search.store";
import { CONNECTION_HISTORY_URL } from "@/features/connection-history/connection-history.service";
import { API_ROUTES } from "@/lib/api-routes";

const API_SEARCH_URLS: Record<string, string[]> = {
  "/connection-history": [CONNECTION_HISTORY_URL],
  "/finished-products": [API_ROUTES.items.finishedProducts],
  "/raw-materials": [API_ROUTES.items.rawMaterials],
  "/semi-finished-products": [API_ROUTES.items.semiFinishedProducts],
  "/home": [API_ROUTES.productionOrders.semiFinishedProducts],
  "/finished-product-production-orders": [
    API_ROUTES.productionOrders.finishedProducts,
  ],
  "/product-orders": [
    API_ROUTES.productionOrders.semiFinishedProducts,
    API_ROUTES.productionOrders.finishedProducts,
  ],
  "/finished-product-summaries": [
    API_ROUTES.productionOrders.finishedProductSummaries,
  ],
};

export default function Search() {
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);

  return <SearchInput key={searchScopePath} searchScopePath={searchScopePath} />;
}

function SearchInput({ searchScopePath }: { searchScopePath: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const { mutate } = useSWRConfig();
  const isConnectionHistory = searchScopePath === "/connection-history";
  const apiSearchUrls = API_SEARCH_URLS[searchScopePath];
  const isApiSearch = Boolean(apiSearchUrls);
  const search = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const setSearch = useSearchStore((state) => state.setSearch);
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    if (!isApiSearch || draft.trim() === search.trim()) return;

    const timer = setTimeout(() => {
      setSearch(searchScopePath, draft.trim());
    }, 1_000);

    return () => clearTimeout(timer);
  }, [draft, isApiSearch, search, searchScopePath, setSearch]);

  const handleSearchChange = (value: string) => {
    if (isApiSearch) setDraft(value);
    else setSearch(searchScopePath, value);
  };

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        if (isApiSearch) {
          const keyword = draft.trim();
          setDraft(keyword);
          setSearch(searchScopePath, keyword);
          if (keyword === search.trim()) {
            void mutate(
              (key) =>
                apiSearchUrls?.includes(Array.isArray(key) ? key[0] : key) ?? false,
            );
          }
        }
        ref.current?.focus();
      }}
    >
      <Input
        type="text"
        aria-label="Tìm kiếm"
        maxLength={isConnectionHistory ? 100 : isApiSearch ? 200 : undefined}
        className="rounded-full  md:w-40 w-0 focus:w-40  md:focus:w-100 focus:ring-0 focus-visible:ring-0 transition-all duration-300 ease-in-out pr-8"
        value={isApiSearch ? draft : search}
        onChange={(e) => handleSearchChange(e.target.value)}
        ref={ref}
      />
      <button
        type="submit"
        aria-label="Tìm kiếm"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <SearchIcon className="size-5" />
      </button>
    </form>
  );
}
