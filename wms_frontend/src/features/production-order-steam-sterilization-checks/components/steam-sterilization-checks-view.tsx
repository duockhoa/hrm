"use client";

import { Skeleton } from "@/components/ui/skeleton";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CookingPot, Plus } from "lucide-react";
import { useState } from "react";
import FormSteamSterilizationCheck from "./form-steam-sterilization-check";
import SteamSterilizationCheckDetail from "./steam-sterilization-check-detail";

type User = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type SteamSterilizationCheck = {
  id: string | number;
  equipment_name?: string | null;
  setting_temperature?: string | number | null;
  setting_time?: number | null;
  checked_at?: string | null;
  configuration_image_path?: string | null;
  createdBy?: User | null;
  checkedBy?: User | null;
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const getUserLabel = (user?: User | null) =>
  user?.name ?? user?.username ?? user?.email ?? "—";

function ConfigurationThumbnail({ path }: { path?: string | null }) {
  if (path) {
    return (
      <AuthenticatedImage
        src={path}
        alt="Ảnh cấu hình hấp"
        className="h-[70px] w-[70px] shrink-0"
        height={70}
        width={70}
        loading="lazy"
        objectFit="contain"
      />
    );
  }

  return (
    <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded bg-gray-200 text-gray-500">
      <CookingPot className="size-8" />
    </div>
  );
}

export default function SteamSterilizationChecksView({
  id,
  onClose,
  embedded = false,
  onSelectCheck,
}: {
  id: string | number;
  onClose?: () => void;
  embedded?: boolean;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCheckId, setSelectedCheckId] = useState<
    string | number | null
  >(null);
  const key = id
    ? API_ROUTES.productionOrders.steamSterilizationChecks(id)
    : null;
  const { data, error, isLoading } = useSWR<SteamSterilizationCheck[]>(
    key,
    () => productionOrdersService.fetchSteamSterilizationChecks(id),
  );

  if (selectedCheckId !== null) {
    return (
      <SteamSterilizationCheckDetail
        id={selectedCheckId}
        onClose={() => setSelectedCheckId(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl min-w-0 rounded border bg-white p-4 shadow-md">
      {!embedded && onClose && (
        <DetailPanelHeader
          title="Theo dõi quá trình tiệt trùng"
          subtitle={`Lệnh sản xuất #${id}`}
          actions={
            <Button type="button" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Thêm mới
            </Button>
          }
          onClose={onClose}
        />
      )}
      {!embedded && (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Thêm lần tiệt trùng</DialogTitle>
            </DialogHeader>
            <FormSteamSterilizationCheck
              productionOrderId={id}
              onClose={() => setIsAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      {embedded ? (
        <div className="mb-4 mt-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            Theo dõi quá trình tiệt trùng
          </h2>
          {data && (
            <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
              {data.length}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-4" />
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không thể tải dữ liệu theo dõi quá trình tiệt trùng.
        </div>
      )}

      {!isLoading && !error && data?.length === 0 && (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có dữ liệu theo dõi quá trình tiệt trùng.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="max-h-[60vh] divide-y divide-gray-200 overflow-auto rounded border">
          {data.map((item) => (
            <div
              key={item.id}
              tabIndex={0}
              role="button"
              className="flex min-h-[90px] cursor-pointer gap-3 bg-white p-2 text-left transition-colors hover:bg-gray-50"
              onClick={() =>
                onSelectCheck
                  ? onSelectCheck(item.id)
                  : setSelectedCheckId(item.id)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (onSelectCheck) {
                    onSelectCheck(item.id);
                  } else {
                    setSelectedCheckId(item.id);
                  }
                }
              }}
            >
              <ConfigurationThumbnail path={item.configuration_image_path} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold uppercase text-gray-900">
                  Phiếu kiểm tra tiệt trùng
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {formatDateTime(item.checked_at)}
                </p>
              </div>
              <div className="flex min-w-28 flex-col items-end gap-2 text-right">
                <p className="text-sm text-gray-700">
                  {getUserLabel(item.createdBy ?? item.checkedBy)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
