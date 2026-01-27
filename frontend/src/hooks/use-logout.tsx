"use client";
import { useRouter } from "next/navigation";
import { logout } from "@/services/auth";
import { useTokens } from "@/store/token.store";
import axiosClient from "@/lib/axios-client";

type UseLogoutOptions = {
  redirectTo?: string;
};

export const useLogout = (options: UseLogoutOptions = {}) => {
  const { clearTokens, refreshToken } = useTokens();
  const deleteRefreshToken = async () => {
    if (refreshToken) {
      try {
        await axiosClient.post("/auth/logout", { refreshToken });
      } catch (error) {
        console.error("Error deleting refresh token:", error);
      }
    }
  };

  const { redirectTo = "/login" } = options;
  const router = useRouter();

  const handleLogout = async () => {
    await deleteRefreshToken();
    await logout();
    clearTokens();
    router.replace(redirectTo);
  };

  return { logout: handleLogout };
};
