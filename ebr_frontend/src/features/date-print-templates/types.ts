export type DatePrintTemplateStatus = "active" | "inactive";

export type DatePrintTemplateCreator = {
  id: number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

export type DatePrintTemplateItem = {
  item_code: string;
  item_name?: string | null;
  unit?: string | null;
};

export type DatePrintTemplate = {
  id: number;
  item_code: string;
  version: number;
  description?: string | null;
  print_content: string;
  print_position?: string | null;
  status: DatePrintTemplateStatus;
  image_path?: string | null;
  item?: DatePrintTemplateItem | null;
  createdBy?: DatePrintTemplateCreator | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateDatePrintTemplatePayload = {
  version?: number;
  description?: string | null;
  print_content: string;
  print_position?: string | null;
};

export type UpdateDatePrintTemplatePayload =
  Partial<CreateDatePrintTemplatePayload> & {
    status?: DatePrintTemplateStatus;
  };
