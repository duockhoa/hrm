"use client";

import Link from "next/link";
import { AiOutlineRight } from "react-icons/ai";

type HeaderListProductionWorkshopProps = {
  href?: string;
  title?: string;
};

export default function HeaderListProductionWorkshop({
  href = "/pressure-differentials",
  title = "Kiểm tra chênh áp",
}: HeaderListProductionWorkshopProps) {
  return (
    <div className="flex w-full justify-between border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href={href}>{title}</Link>
      </div>
    </div>
  );
}
