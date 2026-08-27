"use client";
import DetailUserHeader from "@/components/users/header-detail-user";
import { useParams } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import HomePage from "../page";
import useMobile from "@/hooks/use-mobile";
import useSWR from "swr";
import UserDetail from "@/components/users/detail-user";
import UserRolesInline from "@/components/users/inline-user-roles";
import UserApplicationsInline from "@/components/users/inline-user-applications";
import { userService } from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";
export default function DetailUserPage() {
  const params: any = useParams();
  const isMobile = useMobile();

  const { data, error } = useSWR(`${API_ROUTES.users.base}/${params.id}`, () =>
    userService.fetcherUserById(params.id),
  );
  if (error) {
    return <div>Error loading user data.</div>;
  }
  return (
    <div className="h-[100%] min-h-0 bg-white rounded-lg shadow-md overflow-hidden">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={30}
            className="min-h-0 min-w-100 overflow-hidden"
            minSize={30}
          >
            <HomePage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel
          defaultSize={isMobile ? 100 : 70}
          className="p-4 overflow-auto"
        >
          <DetailUserHeader user={data} />
          <div className="flex flex-col items-center gap-4 mt-4 rounded">
            <UserDetail user={data} />
            {data?.id && <UserRolesInline userId={Number(data.id)} />}
            {data?.id && <UserApplicationsInline userId={Number(data.id)} />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
