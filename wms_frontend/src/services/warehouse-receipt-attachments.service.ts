import axiosClient from "@/lib/axios-client";
import { isAxiosError } from "axios";
import type {
  ReceiptAttachment,
  ReceiptAttachmentType,
} from "@/features/warehouse-receipt-items/receipt-attachments";

const receiptAttachmentsService = {
  async upload(receiptId: number, type: ReceiptAttachmentType, files: File[]) {
    const formData = new FormData();
    formData.append("attachment_type", type);
    files.forEach((file) => formData.append("files", file));
    return (
      await axiosClient.post<ReceiptAttachment[]>(
        `/warehouse-receipt-items/${receiptId}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
    ).data;
  },
  async delete(receiptId: number, attachmentId: number) {
    try {
      return (
        await axiosClient.delete<ReceiptAttachment>(
          `/warehouse-receipt-items/${receiptId}/attachments/${attachmentId}`,
        )
      ).data;
    } catch (error) {
      // An earlier attempt or another editor may have already removed this image.
      if (
        isAxiosError(error) &&
        error.response?.status === 404 &&
        error.response.data?.message === "Receipt attachment not found"
      )
        return;
      throw error;
    }
  },
};

export default receiptAttachmentsService;
