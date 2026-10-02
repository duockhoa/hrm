import type {
  Equipment,
  EquipmentCreatedBy,
  EquipmentParameter,
} from "@/features/equipment/types";

export type ItemEquipment = {
  id: number;
  item_code: string;
  equipment_id: number;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
  equipment: Equipment & {
    parameters?: EquipmentParameter[];
  };
  createdBy?: EquipmentCreatedBy;
};

export type CreateItemEquipmentPayload = {
  equipment_id: number;
};
