import { create } from "zustand";

interface DepartmentState {
  departments: any[];
  departmentsLoading: boolean;
  departmentsError: any;
  setDepartments: (departments: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useDepartmentStore = create<DepartmentState>((set) => ({
  departments: [],
  departmentsLoading: false,
  departmentsError: null,
  setDepartments: (departments) => set({ departments }),
  setIsLoading: (loading) => set({ departmentsLoading: loading }),
  setError: (error) => set({ departmentsError: error }),
}));

export default useDepartmentStore;
