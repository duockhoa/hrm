"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import productionOrdersService from "@/services/product-orders.service";

export default function FormExportDatePrint({
  productionOrderId,
  itemCode,
  onClose,
  onPdfGenerated,
  onExportingChange,
}: {
  productionOrderId: string | number;
  itemCode?: string;
  onClose?: () => void;
  onPdfGenerated?: (file: File) => void;
  onExportingChange?: (exporting: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState("");
  const [format, setFormat] = useState<'word' | 'pdf'>('pdf');
  const { data, error, isLoading, mutate } = useSWR(
    ["date-print-export-templates", productionOrderId],
    () => productionOrdersService.fetchDatePrintExportTemplates(productionOrderId),
  );
  const templates =
    data?.filter((template) => template.status === "active") ?? [];
  const selected = templates.find(
    (template) => String(template.id) === selectedId,
  );

  const handleExport = async () => {
    if (!selected || exporting) return;
    setExporting(true);
    onExportingChange?.(true);
    try {
      const exportFormat = onPdfGenerated ? "pdf" : format;
      const response = await productionOrdersService.exportDatePrint(
        productionOrderId,
        selected.id,
        exportFormat,
        note.trim(),
      );
      const filename = `Theo-doi-in-date-${productionOrderId}-v${selected.version}.${exportFormat === 'pdf' ? 'pdf' : 'docx'}`;
      const file = new File([response.data as Blob], filename, {
        type: exportFormat === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      onPdfGenerated?.(file);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(onPdfGenerated
        ? "Đã tạo PDF và đính kèm vào form tải nội dung date yêu cầu."
        : "Đã xuất phiếu theo dõi in date.");
      onClose?.();
    } catch (error: unknown) {
      let message = "Không thể xuất phiếu theo dõi in date.";
      const body = (error as { response?: { data?: Blob } }).response?.data;
      if (body instanceof Blob) {
        try {
          const payload = JSON.parse(await body.text()) as {
            message?: string | string[];
          };
          if (payload.message)
            message = Array.isArray(payload.message)
              ? payload.message.join("; ")
              : payload.message;
        } catch {
          /* Use the fallback for non-JSON errors. */
        }
      }
      toast.error(message);
    } finally {
      setExporting(false);
      onExportingChange?.(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleExport();
      }}
    >
      {!onPdfGenerated && <h2 className="text-lg font-semibold">Xuất theo dõi in date</h2>}
      <p className="text-sm text-muted-foreground">
        {itemCode ? `Mã hàng: ${itemCode}. ` : ""}Ngày sản xuất, hạn dùng và số lô được lấy từ lệnh
        sản xuất.
      </p>
      {isLoading ? (
        <p>Đang tải biểu mẫu…</p>
      ) : error ? (
        <div>
          <p role="alert">Không thể tải biểu mẫu in date.</p>
          <Button type="button" variant="outline" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <p>Chưa có biểu mẫu in date đang hoạt động cho mã hàng này.</p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="date-print-export-template">Biểu mẫu in date</Label>
          <select
            id="date-print-export-template"
            className="w-full rounded-md border bg-background p-2"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={exporting}
            required
          >
            <option value="">Chọn biểu mẫu</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                Phiên bản {template.version}
                {template.description ? ` — ${template.description}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {selected && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p>Vị trí in: {selected.print_position || "Chưa cập nhật"}</p>
          <pre className="whitespace-pre-wrap break-words font-mono">
            {selected.print_content}
          </pre>
        </div>
      )}
      {!onPdfGenerated && <div className="space-y-2">
        <Label htmlFor="date-print-export-format">Định dạng xuất</Label>
        <select id="date-print-export-format" className="w-full rounded-md border bg-background p-2" value={format} disabled={exporting} onChange={(event) => setFormat(event.target.value as 'word' | 'pdf')}>
          <option value="word">Word (.docx)</option>
          <option value="pdf">PDF (.pdf)</option>
        </select>
      </div>}
      <div className="space-y-2">
        <Label htmlFor="date-print-export-note">Ghi chú (nếu có)</Label>
        <Textarea id="date-print-export-note" value={note} onChange={(event) => setNote(event.target.value)} disabled={exporting} rows={3} maxLength={2000} placeholder="Nhập ghi chú cho phiếu xuất…" />
      </div>
      <Button
        type="submit"
        disabled={!selected || exporting || Boolean(error) || isLoading}
      >
        {exporting ? "Đang xuất…" : onPdfGenerated ? "Tạo PDF và đính kèm" : format === 'pdf' ? "Xuất PDF" : "Xuất Word"}
      </Button>
    </form>
  );
}
