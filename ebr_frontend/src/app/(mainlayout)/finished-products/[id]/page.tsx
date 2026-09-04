"use client";

import ProductDetail from "@/components/detail-product/detail-product";
import { InlineItemFeatureSettings } from "@/features/features";
import { InlineItemEquipmentSettings } from "@/features/item-equipment";
import { InlineMixingActivityTemplates } from "@/features/mixing-activity-templates";
import { DetailFinishProductHeader } from "@/features/finished-products";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import { itemsService } from "@/services/index.service";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import FinishedProductsPage from "../page";

export default function DetailFinishedProductPage() {
  const params: any = useParams();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const [isMixingTemplatesOpen, setIsMixingTemplatesOpen] = useState(false);

  const { data, error } = useSWR(`${API_ROUTES.items.base}/${params.id}`, () =>
    itemsService.fetchItemById(params.id),
  );

  if (error) {
    return <div>Error loading product data.</div>;
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
            <FinishedProductsPage />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          className="min-h-0 min-w-0 overflow-auto p-4"
          minSize={0}
        >
          {isMixingTemplatesOpen ? (
            <div className="flex flex-col items-center rounded">
              <InlineMixingActivityTemplates
                itemCode={data?.item_code}
                itemName={data?.item_name}
                onClose={() => setIsMixingTemplatesOpen(false)}
              />
            </div>
          ) : (
            <>
              <DetailFinishProductHeader
                finishProduct={data}
                onOpenMixingActivityTemplates={() =>
                  setIsMixingTemplatesOpen(true)
                }
              />
              <div className="mt-4 flex flex-col items-center gap-4 rounded">
                <ProductDetail product={data} showDosageForm={false} />
                <InlineItemFeatureSettings itemCode={data?.item_code} />
                <InlineItemEquipmentSettings itemCode={data?.item_code} />
              </div>
            </>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
