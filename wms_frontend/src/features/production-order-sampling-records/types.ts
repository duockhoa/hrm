type SamplingRecordUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderSamplingRecord = {
  id?: number | string;
  production_order_id?: number | string | null;
  sampling_type?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SamplingRecordUser | null;
};

type SamplingRecordPayload = {
  sampling_type: string;
  quantity: string | number;
  unit: string;
};

export type {
  ProductionOrderSamplingRecord,
  SamplingRecordPayload,
  SamplingRecordUser,
};
