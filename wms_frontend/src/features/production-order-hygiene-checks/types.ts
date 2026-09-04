type HygieneCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderHygieneCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  room_or_equipment?: string | null;
  cleaning_type?: string | null;
  result?: string | null;
  note?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: HygieneCheckUser | null;
};

type HygieneCheckPayload = {
  room_or_equipment: string;
  cleaning_type: string;
  result: string;
  note?: string | null;
};

export type {
  HygieneCheckPayload,
  HygieneCheckUser,
  ProductionOrderHygieneCheck,
};
