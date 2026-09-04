"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditProductOrderForm from "./form-edit-product-order";

export default function EditProductionOrderDialog({
  productionOrder,
}: {
  productionOrder: any;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <Button
        type="button"
        className="h-9 bg-gray-950 px-3 text-white hover:bg-gray-800"
        disabled={!productionOrder}
        onClick={() => setIsEditOpen(true)}
      >
        <SquarePen className="size-4" />
        Edit
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lệnh sản xuất</DialogTitle>
        </DialogHeader>
        <EditProductOrderForm
          productionOrder={productionOrder}
          onClose={() => setIsEditOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
