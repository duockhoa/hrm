"use client";
import DetailDepartmentHeader from "@/components/departments/header-detail-department";
import { useParams } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import DepartmentPage from "../page";
import useMobile from "@/hooks/use-mobile";
import useSWR from "swr";
import DetailDepartment from "@/components/departments/detail-department";
import DepartmentMembersInline from "@/components/departments/inline-department-members";
import { departmentsService } from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";
export default function DetailDepartmentPage() {
  const params: any = useParams();
  const isMobile = useMobile();

  const { data, error } = useSWR(
    `${API_ROUTES.departments.base}/${params.name}`,
    () => departmentsService.fetcherDepartmentByName(params.name),
  );

  if (error) {
    return <div>Error loading department data.</div>;
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
