"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import mixingRecordsService from "@/services/production-order-mixing-records.service";

// Temporary reminder for BTP lots. To retire it, delete this file and remove
// its import and JSX call from detail-product-order.tsx. No persisted state.
export default function MissingMixingRecordNotice({
  productionOrderId,
}: {
  productionOrderId: string | number;
}) {
  const [dismissed, setDismissed] = useState(false);
  const {
    data: records,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    API_ROUTES.productionOrders.mixingRecords(productionOrderId),
    () => mixingRecordsService.fetchAllByProductionOrderId(productionOrderId),
    { revalidateOnMount: true },
  );
  // Only a successful, refreshed empty response means no form has been created.
  const open =
    !dismissed &&
    !error &&
    !isLoading &&
    !isValidating &&
    records?.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) setDismissed(true);
      }}
    >
      <DialogContent className="font-sans sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thông báo</DialogTitle>
          <DialogDescription>
            Có vẻ lô sản xuất này bản chưa tạo phiếu pha chế
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => setDismissed(true)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
