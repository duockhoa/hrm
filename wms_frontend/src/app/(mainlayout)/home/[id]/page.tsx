"use client";

import { ProductOrderDetail } from "@/features/production-orders";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import HeaderDetailSemiFinishedLot from "@/components/header-detail-semi-finished-lot/header-detail-semi-finished-lot";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import { useParams } from "next/navigation";
import useSWR from "swr";
import HomePage from "../page";

export default function DetailLotPage() {
  const params = useParams<{ id: string }>();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const { data, error } = useSWR(
    `${API_ROUTES.productionOrders.base}/${params.id}`,
    () => productOrdersService.fetchProductionOrderById(params.id),
  );

  if (error) {
    return <div>Không thể tải dữ liệu lô.</div>;
  }

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={isTablet ? 25 : 30}
            className="min-h-0 min-w-0 overflow-hidden"
            minSize={isTablet ? 20 : 30}
          >
            <HomePage />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          className="min-h-0 min-w-0 overflow-auto p-2 md:p-4"
          minSize={0}
        >
          <HeaderDetailSemiFinishedLot lot={data} />
          <div className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4">
            <ProductOrderDetail productOrder={data} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
