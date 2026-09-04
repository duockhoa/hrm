import { create } from "zustand";

interface RawMaterialState {
  rawMaterials: any[];
  rawMaterialsLoading: boolean;
  rawMaterialsError: any;
  setRawMaterials: (rawMaterials: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useRawMaterialStore = create<RawMaterialState>((set) => ({
  rawMaterials: [],
  rawMaterialsLoading: false,
  rawMaterialsError: null,
  setRawMaterials: (rawMaterials) => set({ rawMaterials }),
  setIsLoading: (loading) => set({ rawMaterialsLoading: loading }),
  setError: (error) => set({ rawMaterialsError: error }),
}));

export default useRawMaterialStore;
