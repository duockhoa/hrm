import { create } from "zustand";

interface UsersState {
  users: any[];
  usersLoading: boolean;
  usersError: any;
  setUsers: (users: any[]) => void;
}

const useUserStore = create<UsersState>((set) => ({
  users: [],
  usersLoading: false,
  usersError: null,
  setUsers: (users) => set({ users }),
}));

export default useUserStore;
