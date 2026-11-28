import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type { RecordListPage } from "@/hooks/use-infinite-record-list";

const routes = API_ROUTES.warehouseVerificationRecords;

export type VerificationSubjectType = "receipt" | "production_order";

export type VerificationParticipant = {
  id: number;
  name: string;
  username: string;
};

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
  participant_user_ids?: number[];
} & ({ warehouse_receipt_item_id: number } | { production_order_id: number });

type VerificationRecordDetail = VerificationRecord & {
  participants: { user: VerificationParticipant }[];
};

const warehouseVerificationRecordsService = {
  async list(search: string, page: number) {
    return (
      await axiosClient.get<RecordListPage<VerificationRecord>>(routes.base, {
        params: { search, page },
      })
    ).data;
  },
  async read(id: number) {
    return (await axiosClient.get<VerificationRecordDetail>(routes.detail(id)))
      .data;
  },
  async participantOptions(search: string, page: number) {
    return (
      await axiosClient.get<RecordListPage<VerificationParticipant>>(
        routes.participantOptions,
        { params: { search, page } },
      )
    ).data;
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
