"use client";

import { isAxiosError } from "axios";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/api-routes";
import { refreshItemCatalog } from "@/lib/item-catalog-refresh";
import itemsService from "@/services/items.service";
import userService from "@/services/user.service";

const catalogUrls = [
  API_ROUTES.items.finishedProducts,
  API_ROUTES.items.semiFinishedProducts,
  API_ROUTES.items.rawMaterials,
];

export default function ItemCatalogSapSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: permissions, error: permissionsError } = useSWR(
    API_ROUTES.users.myPermissions,
    userService.fetchMyPermissions,
  );

  if (
    permissionsError ||
    !permissions?.permissionKeys.includes("items.update")
  ) {
    return null;
  }

  async function syncItems() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const { created, updated, skipped, failed } =
        await itemsService.syncFromSap();
      const changes = `Thêm ${created}, cập nhật ${updated} mặt hàng.`;
      if (skipped || failed) {
        toast.warning(
          `Đã đồng bộ SAP. ${changes} Bỏ qua ${skipped}, lỗi ${failed}.`,
        );
      } else {
        toast.success(`Đã đồng bộ SAP. ${changes}`);
      }
      await Promise.all(catalogUrls.map(refreshItemCatalog)).catch(() => {
        toast.error("Đã đồng bộ SAP nhưng chưa tải lại được danh mục.");
      });
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        message || "Không nhận được kết quả đồng bộ SAP. Vui lòng thử lại.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="ml-auto"
      disabled={isSyncing}
      aria-busy={isSyncing}
      aria-label="SAP – Đồng bộ danh mục mặt hàng"
      onClick={() => void syncItems()}
    >
      <RefreshCw
        aria-hidden="true"
        className={isSyncing ? "size-4 animate-spin" : "size-4"}
      />
      SAP
    </Button>
  );
}
