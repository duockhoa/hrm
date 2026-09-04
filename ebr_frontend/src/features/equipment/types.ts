export type EquipmentCreatedBy = {
  id: number;
  username: string;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

export type Equipment = {
  id: number;
  code: string;
  name: string;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
  createdBy?: EquipmentCreatedBy;
};

export type EquipmentParameterDataType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select";

export type EquipmentParameter = {
  id: number;
  equipment_id: number;
  name: string;
  data_type: EquipmentParameterDataType;
  unit: string | null;
  is_required: boolean;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
  createdBy?: EquipmentCreatedBy;
};

export type CreateEquipmentPayload = {
  code: string;
  name: string;
};

export type UpdateEquipmentPayload = Partial<CreateEquipmentPayload>;

export type CreateEquipmentParameterPayload = {
  name: string;
  data_type: EquipmentParameterDataType;
  unit?: string | null;
  is_required?: boolean;
};

export type UpdateEquipmentParameterPayload =
  Partial<CreateEquipmentParameterPayload>;

export type EquipmentMonitoringValuePayload = {
  parameter_id: number;
  value: string;
  note?: string | null;
};

export type CreateEquipmentMonitoringRecordPayload = {
  production_order_id: number;
  equipment_id: number;
  recorded_at?: string;
  note?: string | null;
  values: EquipmentMonitoringValuePayload[];
};

export type UpdateEquipmentMonitoringRecordPayload =
  Partial<
    Omit<
      CreateEquipmentMonitoringRecordPayload,
      "production_order_id" | "equipment_id"
    >
  >;

export type EquipmentMonitoringRecordValue = {
  id: number;
  record_id?: number;
  parameter_id: number;
  value: string;
  note?: string | null;
  parameter?: EquipmentParameter;
};

export type EquipmentMonitoringRecordImage = {
  id: number;
  record_id: number;
  image_path: string;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
  createdBy?: EquipmentCreatedBy;
};

export type EquipmentMonitoringRecord = {
  id: number;
  production_order_id: number;
  equipment_id: number;
  recorded_at?: string | null;
  note?: string | null;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
  equipment?: Equipment;
  values?: EquipmentMonitoringRecordValue[];
  images?: EquipmentMonitoringRecordImage[];
  createdBy?: EquipmentCreatedBy;
};
