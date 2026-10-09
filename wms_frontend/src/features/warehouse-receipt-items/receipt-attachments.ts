export const RECEIPT_ATTACHMENT_GROUPS = [
  { type: "dispatch_note", label: "Ảnh phiếu xuất kho" },
  { type: "coa", label: "Ảnh COA" },
  { type: "invoice", label: "Ảnh hoá đơn" },
] as const;

export type ReceiptAttachmentType =
  (typeof RECEIPT_ATTACHMENT_GROUPS)[number]["type"];

export type ReceiptAttachment = {
  id: number;
  warehouse_receipt_item_id: number;
  attachment_type: ReceiptAttachmentType;
  file_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by_id: number;
  created_at: string;
  uploadedBy: { id: number; username: string; name: string | null };
};

export type PendingReceiptImages = Record<ReceiptAttachmentType, File[]>;

export const emptyReceiptImages = (): PendingReceiptImages => ({
  dispatch_note: [],
  coa: [],
  invoice: [],
});

export const MAX_RECEIPT_IMAGES_PER_UPLOAD = 10;
export const RECEIPT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function validateReceiptImages(files: File[]) {
  if (files.length > MAX_RECEIPT_IMAGES_PER_UPLOAD)
    return `Chỉ được chọn tối đa ${MAX_RECEIPT_IMAGES_PER_UPLOAD} ảnh mới cho mỗi loại chứng từ trong một lần lưu.`;
  for (const file of files) {
    if (!file.name || [...file.name].length > 255)
      return "Tên file ảnh phải có từ 1 đến 255 ký tự.";
    if (!RECEIPT_IMAGE_ACCEPT.split(",").includes(file.type))
      return `Ảnh "${file.name}" phải là JPG, PNG, WEBP hoặc GIF.`;
    if (file.size === 0) return `Ảnh "${file.name}" không có dữ liệu.`;
    if (file.size > 5 * 1024 * 1024)
      return `Ảnh "${file.name}" vượt quá giới hạn 5 MB.`;
  }
  return null;
}

// Report each completed operation so a retry only submits the remaining work.
export async function saveReceiptImages({
  receiptId,
  pending,
  removedIds,
  api,
  onUploaded,
  onDeleted,
}: {
  receiptId: number;
  pending: PendingReceiptImages;
  removedIds: number[];
  api: {
    upload: (
      receiptId: number,
      type: ReceiptAttachmentType,
      files: File[],
    ) => Promise<ReceiptAttachment[]>;
    delete: (receiptId: number, attachmentId: number) => Promise<unknown>;
  };
  onUploaded: (
    type: ReceiptAttachmentType,
    images: ReceiptAttachment[],
  ) => void;
  onDeleted: (id: number) => void;
}) {
  for (const { type } of RECEIPT_ATTACHMENT_GROUPS) {
    if (!pending[type].length) continue;
    const images = await api.upload(receiptId, type, pending[type]);
    onUploaded(type, images);
  }
  // Upload replacements first, keeping existing images if an upload fails.
  for (const id of removedIds) {
    await api.delete(receiptId, id);
    onDeleted(id);
  }
}
