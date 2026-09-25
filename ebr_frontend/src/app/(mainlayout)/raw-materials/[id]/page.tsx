"use client";

import ProductDetail from "@/components/detail-product/detail-product";
import { InlineItemFeatureSettings } from "@/features/features";
import { InlineItemEquipmentSettings } from "@/features/item-equipment";
import { InlineDatePrintTemplates } from "@/features/date-print-templates";
import { InlineMixingActivityTemplates } from "@/features/mixing-activity-templates";
import { DetailRawMaterialHeader } from "@/features/raw-materials";
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
import RawMaterialsPage from "../page";

export default function DetailRawMaterialPage() {
  const params: any = useParams();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const [templateView, setTemplateView] = useState<"mixing" | "date" | null>(
    null,
  );

  const { data, error } = useSWR(`${API_ROUTES.items.base}/${params.id}`, () =>
    itemsService.fetchItemById(params.id),
  );

  if (error) {
    return <div>Error loading raw material data.</div>;
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
            <RawMaterialsPage />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          className="min-h-0 min-w-0 overflow-auto p-4"
          minSize={0}
        >
          {templateView === "mixing" ? (
            <div className="flex flex-col items-center rounded">
              <InlineMixingActivityTemplates
                itemCode={data?.item_code}
                itemName={data?.item_name}
                onClose={() => setTemplateView(null)}
              />
            </div>
          ) : templateView === "date" ? (
            <div className="flex flex-col items-center rounded">
              <InlineDatePrintTemplates
                itemCode={data?.item_code}
                itemName={data?.item_name}
                onClose={() => setTemplateView(null)}
              />
            </div>
          ) : (
            <>
              <DetailRawMaterialHeader
                rawMaterial={data}
                onOpenMixingActivityTemplates={() => setTemplateView("mixing")}
                onOpenDatePrintTemplates={() => setTemplateView("date")}
              />
              <div className="mt-4 flex flex-col items-center gap-4 rounded">
                <ProductDetail product={data} />
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
