"use client";

import useSWR from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import userService from "@/services/user.service";

export function useWarehouseReceiptAccess() {
  const {
    data: user,
    error: userError,
    isLoading: userLoading,
  } = useSWR(API_ROUTES.users.me, userService.fetcherMe);
  const userId = user?.id;
  const {
    data: permissions,
    error,
    isLoading,
  } = useSWR(
    userId ? [API_ROUTES.users.myPermissions, userId] : null,
    userService.fetchMyPermissions,
  );
  const keys = error || userError ? [] : (permissions?.permissionKeys ?? []);
  const scope = keys.includes("warehouse-receipt-items.read-all")
    ? "all"
    : keys.includes("warehouse-receipt-items.read-own")
      ? "own"
      : "none";
  const canRead = Boolean(userId) && scope !== "none";
  const cacheScope = `${userId ?? "anonymous"}:${scope}`;
  return {
    permissions,
    error: userError || error,
    loading: userLoading || Boolean(userId && isLoading),
    canRead,
    scope,
    cacheScope,
  };
}
