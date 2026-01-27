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
  timeout: 12000,
});

const refreshClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 12000,
});

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const notifyRefreshSuccess = (token: string) => {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(token));
  refreshSubscribers = [];
};

const notifyRefreshFailure = (error: unknown) => {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
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
    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/refresh-token");

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push({
          resolve: (token) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const { refreshToken } = getTokenCache();
      if (!refreshToken) {
        throw error;
      }

      const refreshResponse = await refreshClient.post("/auth/refresh-token", {
        refreshToken,
      });
      const newAccessToken = (refreshResponse.data as { accessToken?: string })
        ?.accessToken;

      if (!newAccessToken) {
        throw error;
      }

      setTokenCache(newAccessToken, refreshToken);
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: newAccessToken, refreshToken }),
      });

      notifyRefreshSuccess(newAccessToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearTokenCache();
      notifyRefreshFailure(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
