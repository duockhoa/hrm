type PostPreparationSolutionCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderPostPreparationSolutionCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  final_volume_image_path?: string | null;
  solution_color?: string | null;
  solution_image_path?: string | null;
  solution_clarity?: string | null;
  solution_ph_1?: string | number | null;
  solution_ph_2?: string | number | null;
  solution_ph_3?: string | number | null;
  checked_by_id?: number | string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  checkedBy?: PostPreparationSolutionCheckUser | null;
  createdBy?: PostPreparationSolutionCheckUser | null;
};

type PostPreparationSolutionCheckPayload = {
  solution_color?: string | null;
  solution_clarity?: string | null;
  solution_ph_1?: string | number | null;
  solution_ph_2?: string | number | null;
  solution_ph_3?: string | number | null;
  checked_by_id?: string | number | null;
};

export type {
  PostPreparationSolutionCheckPayload,
  PostPreparationSolutionCheckUser,
  ProductionOrderPostPreparationSolutionCheck,
};
