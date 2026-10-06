import axiosClient from "@/lib/axios-client";

export type Supplier = {
  card_code: string;
  card_name: string;
  tax_code: string | null;
};

export const SUPPLIERS_URL = "/business-partners?cardType=cSupplier";

const businessPartnersService = {
  async listSuppliers(): Promise<Supplier[]> {
    return (await axiosClient.get(SUPPLIERS_URL)).data;
  },
};

export default businessPartnersService;
