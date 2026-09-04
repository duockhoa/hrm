"use client";

import Link from "next/link";
import { AiOutlineRight } from "react-icons/ai";

export default function HeaderListFinishedProductLot() {
  return (
    <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href="/finished-product-production-orders">Lô thành phẩm</Link>
      </div>
    </div>
  );
}
