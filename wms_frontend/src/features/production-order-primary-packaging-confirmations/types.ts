export type PrimaryPackagingConfirmationPayload = {
  volume_weight_checked: boolean;
  sensory_checked: boolean;
  date_print_checked: boolean;
  hygiene_checked: boolean;
  seal_integrity_checked: boolean;
  note?: string | null;
};

export type PrimaryPackagingConfirmation =
  PrimaryPackagingConfirmationPayload & {
    id: number;
    production_order_id: number;
    created_by_id?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    createdBy?: {
      id: number;
      username?: string | null;
      name?: string | null;
      email?: string | null;
      department?: string | null;
      position?: string | null;
    } | null;
  };
