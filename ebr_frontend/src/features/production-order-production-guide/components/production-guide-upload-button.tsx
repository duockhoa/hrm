"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderProductionGuide } from "../types";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function ProductionGuideUploadButton({
  productionOrderId,
}: {
  productionOrderId: string | number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const guideKey = API_ROUTES.productionOrders.productionGuide(productionOrderId);
  const { data: guide, mutate } = useSWR<ProductionOrderProductionGuide | null>(
    guideKey,
    () => productionOrdersService.fetchProductionGuide(productionOrderId),
  );

  const resetInput = () => {
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      await productionOrdersService.uploadProductionGuide(
        productionOrderId,
        file,
      );
      await mutate();
      toast.success(
        guide
          ? "Đã thay thế file hướng dẫn sản xuất."
          : "Đã tải lên file hướng dẫn sản xuất.",
      );
      resetInput();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể tải lên file hướng dẫn sản xuất."),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      toast.error("Chỉ hỗ trợ PDF, Word, Excel, TXT hoặc CSV.");
      resetInput();
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Dung lượng file tối đa là 20 MB.");
      resetInput();
      return;
    }
    if (guide) {
      setPendingFile(file);
      return;
    }
    void uploadFile(file);
  };

  return (
    <>
      <div className="inline-flex flex-col items-center p-0.5 md:p-1">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />
        <button
          type="button"
          title={guide ? "Thay thế hướng dẫn sản xuất" : "Tải hướng dẫn sản xuất"}
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
        >
          {isUploading ? <Loader2 className="animate-spin" /> : <FileUp />}
        </button>
        <div className="w-[68px] md:w-[90px]">
          <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
            {guide ? "Thay HDSX" : "Tải HDSX"}
          </p>
        </div>
      </div>

      <Dialog
        modal={false}
        open={Boolean(pendingFile)}
        onOpenChange={(open) => !open && !isUploading && resetInput()}
      >
        <DialogContent className="md:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Thay thế hướng dẫn sản xuất</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            File <strong>{guide?.original_filename}</strong> sẽ được thay thế bằng{" "}
            <strong>{pendingFile?.name}</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isUploading} onClick={resetInput}>Hủy</Button>
            <Button type="button" disabled={isUploading || !pendingFile} onClick={() => pendingFile && void uploadFile(pendingFile)}>
              {isUploading ? "Đang tải lên..." : "Thay thế"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
