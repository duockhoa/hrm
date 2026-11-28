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

export const verificationDefectLabels = {
  QUALITY: "Sai lỗi chất lượng",
  QUANTITY: "Sai lỗi số lượng",
  DOCUMENTATION: "Sai lỗi chứng từ",
  DELIVERY: "Sai lỗi giao hàng",
  OTHER: "Khác",
} as const;

export type VerificationDefectInput = {
  verified_quantity: string;
  defect_description: string;
  defect_quantity: string;
  defect_type: keyof typeof verificationDefectLabels;
  proposed_action: string | null;
  note: string | null;
};

export type VerificationDefect = VerificationDefectInput & {
  id: number;
  created_at: string;
  createdBy: VerificationParticipant;
};

type VerificationRecordDetail = VerificationRecord & {
  participants: { user: VerificationParticipant }[];
  details: VerificationDefect[];
};

const warehouseVerificationRecordsService = {
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
  async createDefect(id: number, payload: VerificationDefectInput) {
    return (
      await axiosClient.post<VerificationDefect>(
        routes.defectDetails(id),
        payload,
      )
    ).data;
  },
  async updateDefect(
    id: number,
    detailId: number,
    payload: Partial<VerificationDefectInput>,
  ) {
    return (
      await axiosClient.patch<VerificationDefect>(
        routes.defectDetail(id, detailId),
        payload,
      )
    ).data;
  },
  async deleteDefect(id: number, detailId: number) {
    await axiosClient.delete(routes.defectDetail(id, detailId));
  },
};

export default warehouseVerificationRecordsService;
