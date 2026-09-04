"use client";

import ApplicationDetail from "@/components/applications/detail-application";
import ApplicationDetailHeader from "@/components/applications/header-application-detail";
import ApplicationUsersInline from "@/components/applications/inline-application-users";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { applicationsService } from "@/services/index.service";
import type { Application } from "@/types/application";
import { useParams } from "next/navigation";
import useSWR from "swr";
import ApplicationsPage from "../page";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const applicationId = Number(params.id);
  const isMobile = useMobile();
  const { data: application, error } = useSWR<Application>(
    Number.isInteger(applicationId)
      ? `${API_ROUTES.applications.base}/${applicationId}`
      : null,
    () => applicationsService.fetcherApplicationById(applicationId),
  );

  if (error) {
    return (
      <div className="h-full rounded-lg bg-white p-4 shadow-md">
        Không thể tải thông tin ứng dụng.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={30}
            minSize={30}
            className="min-h-0 min-w-100 overflow-hidden"
          >
            <ApplicationsPage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel
          defaultSize={isMobile ? 100 : 70}
          className="overflow-auto p-4"
        >
          <ApplicationDetailHeader application={application} />
          <div className="mt-4 flex flex-col items-center gap-4 rounded">
            <ApplicationDetail application={application} />
            {application?.id && (
              <ApplicationUsersInline applicationId={application.id} />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
