import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type { RecordListPage } from "@/hooks/use-infinite-record-list";

const routes = API_ROUTES.warehouseVerificationRecords;

export type VerificationSubjectType = "receipt" | "production_order";

export type VerificationSubject = {
  id: number;
  item_code: string;
  item_name: string;
  lot_number: string;
  reference: string | null;
  date: string;
};

export type VerificationRecord = {
  id: number;
  record_code: string;
  location: string;
  created_at: string;
  updated_at: string;
  createdBy: { name: string | null; username: string };
  warehouseReceiptItem: {
    id: number;
    item_code: string;
    item: { item_name: string };
    lot_number: string;
    received_at: string;
  } | null;
  productionOrder: {
    id: number;
    item_code: string;
    item: { item_name: string };
    lot_no: string;
    production_order_code: string | null;
    creation_date: string;
  } | null;
};

type CreateVerificationRecord = {
  location: string;
} & ({ warehouse_receipt_item_id: number } | { production_order_id: number });

const warehouseVerificationRecordsService = {
  async list(search: string, page: number) {
    return (
      await axiosClient.get<RecordListPage<VerificationRecord>>(routes.base, {
        params: { search, page },
      })
    ).data;
  },
  async read(id: number) {
    return (await axiosClient.get<VerificationRecord>(routes.detail(id))).data;
  },
  async subjects(type: VerificationSubjectType, search: string, page: number) {
    return (
      await axiosClient.get<RecordListPage<VerificationSubject>>(
        routes.subjects,
        {
          params: { type, search, page },
        },
      )
    ).data;
  },
  async create(payload: CreateVerificationRecord) {
    return (await axiosClient.post<VerificationRecord>(routes.base, payload))
      .data;
  },
};

export default warehouseVerificationRecordsService;
