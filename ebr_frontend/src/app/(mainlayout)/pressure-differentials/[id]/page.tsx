"use client";

import { ProductionWorkshopPressureDifferentialsPage } from "@/features/production-workshop-pressure-differentials";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import { productionWorkshopsService } from "@/services/index.service";
import { useParams } from "next/navigation";
import useSWR from "swr";
import PressureDifferentialsRoutePage from "../page";

export default function DetailPressureDifferentialsPage() {
  const params: any = useParams();
  const isMobile = useMobile();
  const isTablet = useTablet();

  const { data, error } = useSWR(
    `${API_ROUTES.productionWorkshops.base}/${params.id}`,
    () => productionWorkshopsService.fetchProductionWorkshopById(params.id),
  );

  if (error) {
    return <div>Không thể tải dữ liệu nhà xưởng.</div>;
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
            <PressureDifferentialsRoutePage />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          className="min-h-0 min-w-0 overflow-auto p-2 md:p-4"
          minSize={0}
        >
          <div className="flex flex-col items-center gap-2 rounded md:gap-4">
            <ProductionWorkshopPressureDifferentialsPage
              workshopId={params.id}
              workshop={data}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
