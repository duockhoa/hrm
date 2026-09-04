type ShellWeightCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ShellWeightKey =
  | "shell_1_weight"
  | "shell_2_weight"
  | "shell_3_weight"
  | "shell_4_weight"
  | "shell_5_weight"
  | "shell_6_weight"
  | "shell_7_weight"
  | "shell_8_weight"
  | "shell_9_weight"
  | "shell_10_weight";

type ProductionOrderShellWeightCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  shell_1_weight?: number | string | null;
  shell_2_weight?: number | string | null;
  shell_3_weight?: number | string | null;
  shell_4_weight?: number | string | null;
  shell_5_weight?: number | string | null;
  shell_6_weight?: number | string | null;
  shell_7_weight?: number | string | null;
  shell_8_weight?: number | string | null;
  shell_9_weight?: number | string | null;
  shell_10_weight?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: ShellWeightCheckUser | null;
};

type ShellWeightCheckPayload = Record<ShellWeightKey, string> & {
  unit: string;
};

export type {
  ShellWeightCheckPayload,
  ShellWeightCheckUser,
  ShellWeightKey,
  ProductionOrderShellWeightCheck,
};
