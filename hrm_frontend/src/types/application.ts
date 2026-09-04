export type Application = {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  default_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ApplicationUser = {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  department?: string | null;
  position?: string | null;
  status?: string;
};
