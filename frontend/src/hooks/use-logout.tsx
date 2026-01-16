"use client";
import { useRouter } from "next/navigation";
import { logout } from "@/services/auth";
import { useTokens } from "@/store/token.store";

type UseLogoutOptions = {
  redirectTo?: string;
};

export const useLogout = (options: UseLogoutOptions = {}) => {
  const { redirectTo = "/login" } = options;
  const router = useRouter();
  const { clearTokens } = useTokens();

  const handleLogout = async () => {
    await logout();
    clearTokens();
    router.replace(redirectTo);
  };

  return { logout: handleLogout };
};
