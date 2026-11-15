// lib/axios-proxy.ts (Server-side)
import axios, { AxiosError } from "axios";
import {
  clearTokenCache,
  getTokenCache,
  setTokenCache,
} from "@/store/token.store";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 360000,
});

const refreshClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 360000,
});

let refreshPromise: Promise<string> | null = null;

const redirectToLogin = async () => {
  clearTokenCache();
  if (typeof window === "undefined") {
    return;
  }
  try {
    await fetch("/api/auth", { method: "DELETE" });
  } finally {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
};

// Share one refresh across REST requests and socket reconnects.
export const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const { refreshToken } = getTokenCache();
      if (!refreshToken) throw new Error("Missing refresh token");
      const response = await refreshClient.post("/auth/refresh-token", {
        refreshToken,
      });
      const accessToken = response.data?.accessToken;
      if (typeof accessToken !== "string" || !accessToken)
        throw new Error("Invalid refresh response");
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken }),
      });
      setTokenCache(accessToken, refreshToken);
      return accessToken;
    } catch (error) {
      await redirectToLogin();
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

axiosClient.interceptors.request.use((config) => {
  const { accessToken } = getTokenCache();
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url ?? "";
    const publicAuthEndpoints = [
      "/auth/login",
      "/auth/refresh-token",
      "/auth/request-password-reset",
      "/auth/get-reset-password-otp",
      "/auth/verify-reset-password-otp",
      "/auth/reset-password",
    ];
    const isAuthEndpoint = publicAuthEndpoints.some((endpoint) =>
      url.includes(endpoint),
    );

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const token = await refreshAccessToken();
    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return axiosClient(originalRequest);
  },
);

export default axiosClient;
