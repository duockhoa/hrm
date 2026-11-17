import axiosClient from "@/lib/axios-client";
import { WAREHOUSE_RECEIPT_ITEMS_URL } from "./warehouse-receipt-items.service";

export const RECEIPT_SAMPLING_DRAFTS_URL = "/warehouse-receipt-sampling-drafts";
export const COMBINED_SAMPLING_DRAFTS_URL = "/sampling-request-drafts";
export type SamplingRequestType = "NL" | "TP";
export const samplingDraftListUrl = (type: SamplingRequestType) =>
  type === "TP"
    ? "/finished-product-sampling-drafts"
    : RECEIPT_SAMPLING_DRAFTS_URL;
export const receiptSamplingDraftUrl = (
  receiptId: number,
  type: SamplingRequestType = "NL",
) =>
  `${type === "TP" ? "/production-orders" : WAREHOUSE_RECEIPT_ITEMS_URL}/${receiptId}/sampling-request-draft`;
export const receiptSamplingDraftCacheKey = (
  receiptId: number,
  userId: number,
  type: SamplingRequestType = "NL",
) => [receiptSamplingDraftUrl(receiptId, type), String(userId)] as const;

export type ReceiptSamplingDraft = {
  id: number;
  warehouse_receipt_item_id: number | null;
  production_order_id: number | null;
  request_type: SamplingRequestType;
  expiry_date_text: string | null;
  created_by_id: number | null;
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
  async pendingTypes(): Promise<SamplingRequestType[]> {
    const response = await axiosClient.get(
      `${COMBINED_SAMPLING_DRAFTS_URL}/types`,
    );
    return response.data;
  },
  async send(
    requestId: string,
    type: SamplingRequestType = "NL",
  ): Promise<{
    status: "success";
    requestId: string;
    sentCount: number;
    googleDocUrl: string | null;
  }> {
    const response = await axiosClient.post(
      `${samplingDraftListUrl(type)}/send`,
      { requestId },
      { timeout: 240000 },
    );
    return response.data;
  },
  async read(
    receiptId: number,
    type: SamplingRequestType = "NL",
  ): Promise<ReceiptSamplingDraft | null> {
    const response = await axiosClient.get(
      receiptSamplingDraftUrl(receiptId, type),
    );
    return response.data || null;
  },
  async save(
    receiptId: number,
    location: string,
    type: SamplingRequestType = "NL",
  ): Promise<ReceiptSamplingDraft> {
    const response = await axiosClient.put(
      receiptSamplingDraftUrl(receiptId, type),
      {
        location,
      },
    );
    return response.data;
  },
};
