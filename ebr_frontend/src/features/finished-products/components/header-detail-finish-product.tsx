"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditSemiFinishedProductForm } from "@/features/semi-finished-products";
import { FileText, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiOutlineRight } from "react-icons/ai";

export default function DetailFinishProductHeader({
  finishProduct,
  onOpenMixingActivityTemplates,
}: {
  finishProduct: any;
  onOpenMixingActivityTemplates?: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex w-full justify-between border-b border-gray-200 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link className="shrink-0" href="/finished-products">
          Danh mục thành phẩm
        </Link>
        <AiOutlineRight className="shrink-0" />
        <p className="truncate">{finishProduct?.item_code}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          className="h-9 bg-gray-950 px-3 text-white hover:bg-gray-800"
          disabled={!finishProduct}
          onClick={onOpenMixingActivityTemplates}
        >
          <FileText className="size-4" />
          BM Pha chế
        </Button>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <Button
            type="button"
            className="h-9 bg-gray-950 px-3 text-white hover:bg-gray-800"
            disabled={!finishProduct}
            onClick={() => setIsEditOpen(true)}
          >
            <SquarePen className="size-4" />
            Sửa
          </Button>
          <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa thông số thành phẩm</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto pr-1">
              <EditSemiFinishedProductForm
                product={finishProduct}
                kind="finished"
                onClose={() => setIsEditOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => router.push("/finished-products")}
          aria-label="Thoát detail"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
