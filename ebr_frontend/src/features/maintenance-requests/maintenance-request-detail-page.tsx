"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import { SquarePen, X } from "lucide-react";
import { isAxiosError } from "axios";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import {
  maintenanceRequestKey,
  maintenanceRequestsService as service,
} from "@/services/maintenance-requests.service";
import MaintenanceRequestsPage from "./maintenance-requests-page";
import MaintenanceRequestDetail from "./maintenance-request-detail";
import MaintenanceRequestFormDialog from "./maintenance-request-form-dialog";
import { errorMessage, isRequestLocked } from "./utils";

export default function MaintenanceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data, error, mutate } = useSWR(maintenanceRequestKey(id), () =>
    service.detail(id),
  );
  const locked = data ? isRequestLocked(data) : true;

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={isTablet ? 25 : 30}
            className="min-h-0 min-w-0 overflow-hidden"
            minSize={isTablet ? 20 : 30}
          >
            <MaintenanceRequestsPage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          className="min-h-0 min-w-0 overflow-auto p-2 md:p-4"
          minSize={0}
        >
          <div className="flex w-full justify-between gap-2 border-b border-gray-200 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <Link className="shrink-0" href="/maintenance-requests">Báo cáo sự cố</Link>
              <AiOutlineRight className="shrink-0" />
              <p className="truncate">{data?.requestCode}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                className="h-9 bg-gray-950 px-3 text-white hover:bg-gray-800"
                disabled={!data || Boolean(error) || locked}
                title={locked && data ? "Báo cáo đã đóng hoặc đã có lệnh công việc nên không thể sửa" : "Sửa báo cáo sự cố"}
                onClick={() => setEditingId(id)}
              >
                <SquarePen className="size-4" />
                Sửa
              </Button>
              <Button variant="ghost" size="icon" className="size-9" asChild>
                <Link href="/maintenance-requests" aria-label="Thoát chi tiết báo cáo sự cố">
                  <X className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4">
            {error ? (
              <div role="alert" className="w-full max-w-4xl rounded border bg-white p-4 text-sm">
                <p className="text-red-600">
                  {isAxiosError(error) && error.response?.status === 404
                    ? "Không tìm thấy báo cáo sự cố."
                    : `Không thể tải báo cáo sự cố. ${errorMessage(error)}`}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => void mutate()}>Thử lại</Button>
              </div>
            ) : (
              <MaintenanceRequestDetail record={data} />
            )}
          </div>
          {editingId === id && data ? (
            <MaintenanceRequestFormDialog key={id} record={data} onClose={() => setEditingId(null)} />
          ) : null}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
