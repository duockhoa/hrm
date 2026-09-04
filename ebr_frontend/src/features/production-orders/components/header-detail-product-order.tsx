"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import EditProductionOrderDialog from "./edit-production-order-dialog";

const PRODUCT_ORDERS_ROUTE = "/product-orders";

export default function HeaderDetailProductOrder({ lot }: { lot: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productionCode = lot?.item_code ?? "";
  const title = [productionCode, lot?.lot_no].filter(Boolean).join(" - ");
  const query = searchParams.toString();
  const listRoute = query
    ? `${PRODUCT_ORDERS_ROUTE}?${query}`
    : PRODUCT_ORDERS_ROUTE;

  return (
    <div className="flex w-full justify-between border-b border-gray-200 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link className="shrink-0" href={listRoute}>
          Tổng hợp lô
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
          onClick={() => router.push(listRoute)}
          aria-label="Thoát detail"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
