type DateCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  department?: string | null;
  position?: string | null;
  status?: string | null;
};

type DateCheckImage = {
  id?: number | string;
  date_check_id?: number | string;
  image_path?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: DateCheckUser | null;
};

type ProductionOrderDateCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  package_type?: string | null;
  request_file_path?: string | null;
  approval_status?: "pending" | "approved" | "rejected" | string | null;
  created_by_id?: number | string | null;
  approved_by_id?: number | string | null;
  checked_at?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: DateCheckUser | null;
  approvedBy?: DateCheckUser | null;
  images?: DateCheckImage[] | null;
};

export type { DateCheckImage, DateCheckUser, ProductionOrderDateCheck };
