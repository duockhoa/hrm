import { create } from "zustand";

interface UserState {
  user: any;
  setUser: (user: any) => void;
  clearUser: () => void;
}

const USER_CACHE_KEY = "ebmr-user-store";

const getInitialUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(USER_CACHE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const useUserStore = create<UserState>((set) => ({
  user: getInitialUser(),
  setUser: (user) => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      } catch {
        // ignore storage errors
      }
    }

    set({ user });
  },
  clearUser: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(USER_CACHE_KEY);
    }

    set({ user: null });
  },
}));

export default useUserStore;
