type DosageFormCreator = {
  id?: string | number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type DosageForm = {
  id: number;
  name: string;
  sensory_requirement?: string | null;
  created_by_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: DosageFormCreator | null;
};

type DosageFormPayload = {
  name: string;
  sensory_requirement?: string | null;
};

type UpdateDosageFormPayload = Partial<DosageFormPayload>;

export type {
  DosageForm,
  DosageFormPayload,
  UpdateDosageFormPayload,
};
