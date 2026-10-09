import axiosClient from "@/lib/axios-client";

export const WAREHOUSE_RECEIPT_ITEMS_URL = "/warehouse-receipt-items";

export type WarehouseReceiptItem = {
  id: number;
  item_code: string;
  quantity: string | number | null;
  unit: string | null;
  manufacturer_lot_number: string | null;
  lot_number: string;
  expiry_date: string | null;
  packaging_specification: string | null;
  supplier_name: string | null;
  supplier_code: string | null;
  supplier: {
    card_code: string;
    card_name: string;
    tax_code: string | null;
  } | null;
  manufacturer_name: string | null;
  manufacturer_code: string | null;
  manufacturer: {
    manufacturer_code: string;
    manufacturer_name: string;
  } | null;
  note: string | null;
  received_at: string;
  entered_by_id: number;
  created_at: string;
  updated_at: string;
  item: { item_code: string; item_name: string | null; unit: string | null };
  enteredBy: { id: number; username: string; name: string | null };
};

export type WarehouseReceiptItemPayload = Pick<
  WarehouseReceiptItem,
  | "item_code"
  | "unit"
  | "manufacturer_lot_number"
  | "lot_number"
  | "expiry_date"
  | "packaging_specification"
  | "manufacturer_code"
  | "note"
> & {
  quantity: string | number;
  supplier_code: string;
};

const warehouseReceiptItemsService = {
  async list(): Promise<WarehouseReceiptItem[]> {
    return (await axiosClient.get(WAREHOUSE_RECEIPT_ITEMS_URL)).data;
  },
  async read(id: number): Promise<WarehouseReceiptItem> {
    return (await axiosClient.get(`${WAREHOUSE_RECEIPT_ITEMS_URL}/${id}`)).data;
  },
  async create(
    payload: WarehouseReceiptItemPayload,
  ): Promise<WarehouseReceiptItem> {
    return (await axiosClient.post(WAREHOUSE_RECEIPT_ITEMS_URL, payload)).data;
  },
  async update(
    id: number,
    payload: Partial<WarehouseReceiptItemPayload>,
  ): Promise<WarehouseReceiptItem> {
    return (
      await axiosClient.patch(`${WAREHOUSE_RECEIPT_ITEMS_URL}/${id}`, payload)
    ).data;
  },
  async delete(id: number): Promise<WarehouseReceiptItem> {
    return (await axiosClient.delete(`${WAREHOUSE_RECEIPT_ITEMS_URL}/${id}`))
      .data;
  },
};

export default warehouseReceiptItemsService;
