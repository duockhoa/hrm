"use client";
import DetailDepartmentHeader from "@/components/header-detail-department/header-detail-department";
import { useParams } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import DepartmentPage from "../page";
import useMobile from "@/hooks/use-mobile";
import useSWR from "swr";
import DetailDepartment from "@/components/detail-department/detail-department";
import DepartmentMembersInline from "@/components/inline-department-members/inline-department-members";
import { departmentsService } from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";
export default function DetailDepartmentPage() {
  const params: any = useParams();
  const isMobile = useMobile();

  const { data, error, isLoading } = useSWR(
    `${API_ROUTES.departments.base}/${params.name}`,
    () => departmentsService.fetcherDepartmentByName(params.name),
  );

  if (error) {
    return <div>Error loading department data.</div>;
  }
  return (
    <div className="h-[100%] bg-white rounded-lg shadow-md overflow-auto">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={30}
            className="overflow-auto min-w-100"
            minSize={30}
          >
            <DepartmentPage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel
          defaultSize={isMobile ? 100 : 70}
          className="p-4 overflow-auto"
        >
          <DetailDepartmentHeader department={data} />
          <div className="flex flex-col items-center gap-4 mt-4 rounded">
            <DetailDepartment department={data} />
            <DepartmentMembersInline members={data?.users || []} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
