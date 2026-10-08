export type Manufacturer = {
  id: number;
  manufacturer_code: string;
  manufacturer_name: string;
  created_by_id: number | null;
  createdBy: { id: number; username: string; name: string | null } | null;
  created_at: string;
  updated_at: string;
};

export type ManufacturerPayload = Pick<Manufacturer, "manufacturer_name">;
