import { create } from "zustand";

interface ProductOrderState {
  productOrders: any[];
  productOrdersLoading: boolean;
  productOrdersError: any;
  setProductOrders: (productOrders: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useProductOrderStore = create<ProductOrderState>((set) => ({
  productOrders: [],
  productOrdersLoading: false,
  productOrdersError: null,
  setProductOrders: (productOrders) => set({ productOrders }),
  setIsLoading: (loading) => set({ productOrdersLoading: loading }),
  setError: (error) => set({ productOrdersError: error }),
}));

export default useProductOrderStore;
