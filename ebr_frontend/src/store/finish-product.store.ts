import { create } from "zustand";

interface FinishProductState {
  finishedProducts: any[];
  finishedProductsLoading: boolean;
  finishedProductsError: any;
  setFinishedProducts: (finishedProducts: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useFinishProductStore = create<FinishProductState>((set) => ({
  finishedProducts: [],
  finishedProductsLoading: false,
  finishedProductsError: null,
  setFinishedProducts: (finishedProducts) => set({ finishedProducts }),
  setIsLoading: (loading) => set({ finishedProductsLoading: loading }),
  setError: (error) => set({ finishedProductsError: error }),
}));

export default useFinishProductStore;
