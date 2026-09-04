import { create } from "zustand";

interface SemiFinishProductState {
  semiFinishedProducts: any[];
  semiFinishedProductsLoading: boolean;
  semiFinishedProductsError: any;
  setSemiFinishedProducts: (semiFinishedProducts: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useSemiFinishProductStore = create<SemiFinishProductState>((set) => ({
  semiFinishedProducts: [],
  semiFinishedProductsLoading: false,
  semiFinishedProductsError: null,
  setSemiFinishedProducts: (semiFinishedProducts) =>
    set({ semiFinishedProducts }),
  setIsLoading: (loading) => set({ semiFinishedProductsLoading: loading }),
  setError: (error) => set({ semiFinishedProductsError: error }),
}));

export default useSemiFinishProductStore;
