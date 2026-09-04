import { create } from "zustand";

interface UsersState {
  users: any[];
  usersLoading: boolean;
  usersError: any;
  setUsers: (users: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: any) => void;
}

const useUsersStore = create<UsersState>((set) => ({
  users: [],
  usersLoading: false,
  usersError: null,
  setUsers: (users) => set({ users }),
  setIsLoading: (loading) => set({ usersLoading: loading }),
  setError: (error) => set({ usersError: error }),
}));

export default useUsersStore;
