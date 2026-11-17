import axiosClient from "@/lib/axios-client";
import { WAREHOUSE_RECEIPT_ITEMS_URL } from "./warehouse-receipt-items.service";

export const RECEIPT_SAMPLING_DRAFTS_URL = "/warehouse-receipt-sampling-drafts";
export const receiptSamplingDraftUrl = (receiptId: number) =>
  `${WAREHOUSE_RECEIPT_ITEMS_URL}/${receiptId}/sampling-request-draft`;

export type ReceiptSamplingDraft = {
  id: number;
  warehouse_receipt_item_id: number;
  item_code: string | null;
  item_name: string | null;
  quantity: string | number | null;
  unit: string | null;
  supplier_name: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export const receiptSamplingDraftsService = {
  async send(
    requestId: string,
  ): Promise<{
    status: "success";
    requestId: string;
    sentCount: number;
    googleDocUrl: string | null;
  }> {
    const response = await axiosClient.post(
      `${RECEIPT_SAMPLING_DRAFTS_URL}/send`,
      { requestId },
      { timeout: 180000 },
    );
    return response.data;
  },
  async read(receiptId: number): Promise<ReceiptSamplingDraft | null> {
    const response = await axiosClient.get(receiptSamplingDraftUrl(receiptId));
    return response.data || null;
  },
  async save(
    receiptId: number,
    location: string,
  ): Promise<ReceiptSamplingDraft> {
    const response = await axiosClient.put(receiptSamplingDraftUrl(receiptId), {
      location,
    });
    return response.data;
  },
};
