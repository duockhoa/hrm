"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import DateCheckDetail from "./detail-date-check/detail-date-check";
import FormProductionOrderDateCheck from "./form-production-order-date-check/form-production-order-date-check";
import InlineProductionOrderDateChecks from "./inline-production-order-date-checks/inline-production-order-date-checks";

export default function DateChecksView({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedCheckId, setSelectedCheckId] = React.useState<
    string | number | null
  >(null);
  const key = API_ROUTES.productionOrders.dateChecks(id);
  const { data, error } = useSWR(key, () =>
    productionOrdersService.fetchDateChecks(id),
  );

  if (selectedCheckId !== null) {
    return (
      <DateCheckDetail
        id={selectedCheckId}
        onClose={() => setSelectedCheckId(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl min-w-0 rounded border bg-white p-4 shadow-md">
      <DetailPanelHeader
        title="Theo dõi In Date"
        subtitle={`Lệnh sản xuất #${id}`}
        actions={
          <Button type="button" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" />
            Thêm mới
          </Button>
        }
        onClose={onClose}
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Thêm phiếu In Date</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <FormProductionOrderDateCheck
              productionOrderId={id}
              onClose={() => setIsAddOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải dữ liệu theo dõi In Date.
          </div>
        ) : (
          <InlineProductionOrderDateChecks
            compact
            data={data}
            selectedCheckId={null}
            onSelectCheck={setSelectedCheckId}
          />
        )}
      </div>
    </div>
  );
}
