"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AiOutlineRight } from "react-icons/ai";
import type { ProductionWorkshop } from "../types";

const PRESSURE_DIFFERENTIALS_ROUTE = "/pressure-differentials";

export default function HeaderDetailProductionWorkshop({
  action,
  workshop,
}: {
  action?: ReactNode;
  workshop?: ProductionWorkshop;
}) {
  const router = useRouter();
  const title = workshop?.code ?? "";

  return (
    <div className="flex w-full justify-between border-b border-gray-200 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link className="shrink-0" href={PRESSURE_DIFFERENTIALS_ROUTE}>
          Kiểm tra chênh áp
        </Link>
        <AiOutlineRight className="shrink-0" />
        <p className="truncate">{title || "Chi tiết"}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {action}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => router.push(PRESSURE_DIFFERENTIALS_ROUTE)}
          aria-label="Thoát detail"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
