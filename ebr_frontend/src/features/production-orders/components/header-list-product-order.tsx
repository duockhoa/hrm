"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";

export default function ListProductOrderHeader() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query ? `/product-orders?${query}` : "/product-orders";

  return (
    <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href={href}>Tổng hợp lô</Link>
      </div>
    </div>
  );
}
