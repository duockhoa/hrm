type SensoryCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type SensoryCheckImage = {
  id: number | string;
  sensory_check_id?: number | string | null;
  image_path: string;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductionOrderSensoryCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  color?: string | null;
  smell?: string | null;
  taste?: string | null;
  note?: string | null;
  images?: SensoryCheckImage[];
  /** Field cũ, giữ lại để tương thích với dữ liệu backend trước đây. */
  image_path?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SensoryCheckUser | null;
};

type SensoryCheckPayload = {
  color?: string | null;
  smell?: string | null;
  taste?: string | null;
  note?: string | null;
};

export type {
  ProductionOrderSensoryCheck,
  SensoryCheckImage,
  SensoryCheckPayload,
  SensoryCheckUser,
};
