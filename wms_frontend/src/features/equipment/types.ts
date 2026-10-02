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
