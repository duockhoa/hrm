export const SAP_PRODUCTION_RECEIPT = 'InventoryGenEntries';
export const SAP_PRODUCTION_RECEIPT_LINES = `${SAP_PRODUCTION_RECEIPT}/DocumentLines`;
export const SAP_PRODUCTION_ORDER_BASE_TYPE = 202;

export type SapProductionOrderReference = {
  id: number;
  item_code: string;
  lot_no: string;
  production_order_code: string | null;
};

export type SapProductionOrderLookup = {
  AbsoluteEntry: number;
  DocumentNumber: number;
  ItemNo: string;
  U_SL: string | null;
  U_MLSX: string | null;
};

type SapProductionReceiptHeader = {
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  Comments: string | null;
  JournalMemo: string | null;
  Reference2: string | null;
};

type SapProductionReceiptLine = {
  LineNum: number;
  BaseType: number;
  BaseEntry: number;
  ItemCode: string;
  ItemDescription: string | null;
  Quantity: number;
  Price: number | null;
  WarehouseCode: string | null;
  MeasureUnit: string | null;
  Currency: string | null;
  U_SL: string | null;
  U_HSD: string | null;
  U_NSX: string | null;
};

export type SapProductionReceipt = SapProductionReceiptHeader & {
  DocumentLines: SapProductionReceiptLine[];
};

export type SapProductionReceiptRow = {
  [SAP_PRODUCTION_RECEIPT]: SapProductionReceiptHeader;
  [SAP_PRODUCTION_RECEIPT_LINES]: SapProductionReceiptLine;
};
