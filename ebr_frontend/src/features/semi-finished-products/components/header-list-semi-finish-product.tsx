"use client";

import Link from "next/link";
import { AiOutlineRight } from "react-icons/ai";
import ItemCatalogSapSyncButton from "@/components/item-catalog-sap-sync-button/item-catalog-sap-sync-button";

export default function ListSemiFinishProductHeader() {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href="/semi-finished-products">Danh mục bán thành phẩm</Link>
      </div>
      <ItemCatalogSapSyncButton />
    </div>
  );
}
