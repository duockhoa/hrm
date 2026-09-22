"use client";

import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { equipmentService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";
import EquipmentOperationItem from "./equipment-operation-item";

export const EQUIPMENT_OPERATION_LEDGER_ROUTE = "/equipment-operation-records";

export default function EquipmentOperationList() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const activeEquipmentId = pathname.startsWith(
    `${EQUIPMENT_OPERATION_LEDGER_ROUTE}/`,
  )
    ? decodeURIComponent(
        pathname.replace(`${EQUIPMENT_OPERATION_LEDGER_ROUTE}/`, ""),
      )
    : null;

  const { data, error, isLoading } = useSWR(
    API_ROUTES.equipment.base,
    equipmentService.fetchEquipment,
  );

  const filteredEquipment = useMemo(
    () =>
      (data ?? [])
        .filter((equipment) =>
          matchesSearchKeyword([equipment.code, equipment.name], searchKeyword),
        )
        .sort((first, second) => first.code.localeCompare(second.code)),
    [data, searchKeyword],
  );

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "equipmentOperationLedgerListScroll",
    restoreSignal: `${filteredEquipment.length}:${pathname}`,
  });

  const handleClick = (equipmentId: number) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`${EQUIPMENT_OPERATION_LEDGER_ROUTE}/${equipmentId}`, {
      scroll: false,
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href={EQUIPMENT_OPERATION_LEDGER_ROUTE}>
              Sổ theo dõi vận hành thiết bị
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách thiết bị.
          </p>
        ) : isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <EquipmentOperationItem
              key={index}
              equipment={null}
              onClick={() => {}}
            />
          ))
        ) : filteredEquipment.length > 0 ? (
          filteredEquipment.map((equipment) => (
            <EquipmentOperationItem
              key={equipment.id}
              equipment={equipment}
              isActive={activeEquipmentId === String(equipment.id)}
              onClick={() => handleClick(equipment.id)}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy thiết bị phù hợp."
              : "Chưa có thiết bị nào."}
          </p>
        )}
      </div>
    </div>
  );
}
