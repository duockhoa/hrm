"use client";

import { Button } from "@/components/ui/button";
import EditProductionOrderDialog from "@/features/production-orders/components/edit-production-order-dialog";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";

export default function HeaderDetailSemiFinishedLot({ lot }: { lot: any }) {
  const router = useRouter();
  const productionCode = lot?.item_code ?? "";
  const title = [productionCode, lot?.lot_no].filter(Boolean).join(" - ");

  return (
    <div className="flex w-full justify-between border-b border-gray-200 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link className="shrink-0" href="/home">
          Lô bán thành phẩm
        </Link>
        <AiOutlineRight className="shrink-0" />
        <p className="truncate">{title}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <EditProductionOrderDialog productionOrder={lot} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => router.push("/home")}
          aria-label="Thoát detail"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
