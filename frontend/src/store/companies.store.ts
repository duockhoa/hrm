import { create } from "zustand";

interface CompanyState {
  companies: any[];
  companiesLoading: boolean;
  companiesError: any;
  setCompanies: (companies: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  companiesLoading: false,
  companiesError: null,
  setCompanies: (companies) => set({ companies }),
  setIsLoading: (loading) => set({ companiesLoading: loading }),
  setError: (error) => set({ companiesError: error }),
}));

export default useCompanyStore;
