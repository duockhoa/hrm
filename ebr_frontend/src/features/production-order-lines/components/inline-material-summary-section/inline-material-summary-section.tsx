"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import FormMaterialSummary from "../form-material-summary/form-material-summary";
import InlineMaterialSummary from "../inline-material-summary/inline-material-summary";
import {
  findMaterialSummaryForLine,
  type ProductionOrderLine,
  type ProductionOrderMaterialSummary,
} from "../../utils";

export default function InlineMaterialSummarySection({
  productionOrderId,
  productionOrderLines,
}: {
  productionOrderId: string | number;
  productionOrderLines: ProductionOrderLine[] | undefined;
}) {
  const [selectedLine, setSelectedLine] =
    React.useState<ProductionOrderLine | null>(null);
  const {
    data: materialSummaries,
    error: materialSummariesError,
    mutate: mutateMaterialSummaries,
  } = useSWR<ProductionOrderMaterialSummary[]>(
    API_ROUTES.productionOrders.materialSummaries(productionOrderId),
    () => productionOrdersService.fetchMaterialSummaries(productionOrderId),
  );
  const selectedSummary = selectedLine
    ? findMaterialSummaryForLine(selectedLine, materialSummaries)
    : null;

  if (materialSummariesError) {
    return (
      <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Thông tin vật liệu</h2>
        </div>
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không thể tải tổng kết vật liệu.
        </div>
      </div>
    );
  }

  return (
    <>
      <InlineMaterialSummary
        data={
          productionOrderLines && materialSummaries
            ? productionOrderLines
            : undefined
        }
        materialSummaries={materialSummaries}
        onSelectLine={setSelectedLine}
      />
      <Dialog
        modal={false}
        open={Boolean(selectedLine)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLine(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Tổng kết vật liệu</DialogTitle>
          </DialogHeader>
          {selectedLine ? (
            <FormMaterialSummary
              productionOrderId={productionOrderId}
              line={selectedLine}
              summary={selectedSummary}
              onCancel={() => setSelectedLine(null)}
              onSaved={async () => {
                await mutateMaterialSummaries();
                setSelectedLine(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
