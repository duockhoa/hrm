"use client";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  EquipmentOperationDetail,
  EquipmentOperationList,
  EQUIPMENT_OPERATION_LEDGER_ROUTE,
} from "@/features/equipment-operation-ledger";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import { equipmentService } from "@/services/index.service";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import { X } from "lucide-react";
import useSWR from "swr";

export default function EquipmentOperationRecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const { data: equipment, error } = useSWR(
    API_ROUTES.equipment.detail(params.id),
    () => equipmentService.fetchEquipmentById(params.id),
  );

  const detailPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 w-full bg-white p-2 md:p-4 md:pb-0">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link className="shrink-0" href={EQUIPMENT_OPERATION_LEDGER_ROUTE}>
              Sổ theo dõi vận hành thiết bị
            </Link>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{equipment?.code || "Chi tiết thiết bị"}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => router.push(EQUIPMENT_OPERATION_LEDGER_ROUTE)}
            aria-label="Thoát chi tiết"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 md:p-4">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải chi tiết thiết bị.
          </p>
        ) : (
          <EquipmentOperationDetail equipment={equipment} />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile ? (
          <ResizablePanel
            defaultSize={isTablet ? 25 : 30}
            minSize={isTablet ? 20 : 30}
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <EquipmentOperationList />
          </ResizablePanel>
        ) : null}

        {!isMobile ? <ResizableHandle /> : null}

        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          minSize={0}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {detailPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
