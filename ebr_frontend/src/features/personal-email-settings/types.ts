export type EmailType = {
  id: number;
  code: string;
  name: string;
};

export type PersonalEmailRecipients = {
  id?: number;
  email_type_id: number;
  email: string;
};
