"use client";

import Link from "next/link";
import { AiOutlineRight } from "react-icons/ai";
import {
  ListFilterButton,
  type ListFilters,
} from "@/components/list-filter-button";
import { lotFilters } from "@/lib/basic-list-filters";

export default function HeaderListSemiFinishedLot({
  title = "Lô bán thành phẩm",
  href = "/home",
  filters,
  onApply,
  onTitleClick,
  disabled = false,
}: {
  title?: string;
  href?: string;
  filters: ListFilters;
  onApply: (filters: ListFilters) => void;
  onTitleClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 w-full bg-white p-2 pr-12">
      <div className="absolute right-2 top-2">
        <ListFilterButton
          groups={lotFilters}
          filters={filters}
          onApply={onApply}
          disabled={disabled}
          title="Lọc dữ liệu"
        />
      </div>
      <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
        <div className="flex items-center gap-2">
          <AiOutlineRight />
          <Link href={href} onClick={onTitleClick}>
            {title}
          </Link>
        </div>
      </div>
    </div>
  );
}
