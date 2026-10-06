export const SAP_BP_STRING_FIELDS = {
  tax_code: 'FederalTaxID',
  foreign_name: 'CardForeignName',
  address: 'Address',
  custom_address: 'U_Diachi',
  city: 'City',
  country_code: 'Country',
  phone: 'Phone1',
  phone_secondary: 'Phone2',
  mobile: 'Cellular',
  email: 'EmailAddress',
  contact_person: 'ContactPerson',
  notes: 'Notes',
  partner_origin: 'U_LDT',
  custom_partner_label: 'U_MaDK',
  custom_contact_person: 'U_NLH',
  custom_phone: 'U_SDT',
  sap_created_time: 'CreateTime',
  sap_updated_time: 'UpdateTime',
} as const;

export const SAP_BP_DATE_FIELDS = {
  valid_from: 'ValidFrom',
  valid_to: 'ValidTo',
  frozen_from: 'FrozenFrom',
  frozen_to: 'FrozenTo',
  sap_created_date: 'CreateDate',
  sap_updated_date: 'UpdateDate',
} as const;

export const SAP_BP_SELECT = [
  'CardCode',
  'CardName',
  'CardType',
  'GroupCode',
  'Valid',
  'Frozen',
  ...Object.values(SAP_BP_STRING_FIELDS),
  ...Object.values(SAP_BP_DATE_FIELDS),
].join(',');

export const SAP_BP_TYPES = ['cSupplier', 'cCustomer', 'cLid'] as const;

export type SapBusinessPartner = {
  CardCode?: string | null;
  CardName?: string | null;
  CardType?: string | null;
  GroupCode?: number | null;
  Valid?: string | null;
  Frozen?: string | null;
} & Partial<
  Record<
    | (typeof SAP_BP_STRING_FIELDS)[keyof typeof SAP_BP_STRING_FIELDS]
    | (typeof SAP_BP_DATE_FIELDS)[keyof typeof SAP_BP_DATE_FIELDS],
    string | null
  >
>;
