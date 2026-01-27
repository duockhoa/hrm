"use client";
import DetailUserHeader from "@/components/detail-user-header/detail-user-header";
import { useParams } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import HomePage from "../page";
import useMobile from "@/hooks/use-mobile";
import useSWR from "swr";
import axiosClient from "@/lib/axios-client";
import UserDetail from "@/components/user-detail/user-detail";
import LeaveInformationDetail from "@/components/leave-information-detail/leave-information-detail";
import ContractInline from "@/components/contract-inline/contact-inline";
export default function DetailUserPage() {
  const params = useParams();
  const isMobile = useMobile();

  const fetcher = async (url: string) => {
    const response = await axiosClient.get(url);
    return response.data;
  };
  const { data, error, isLoading } = useSWR(`users/${params.id}`, fetcher);
  if (error) {
    return <div>Error loading user data.</div>;
  }
  console.log("Detail User Data:", data);
  return (
    <div className="h-[100%] bg-white rounded-lg shadow-md overflow-auto">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={30}
            className="overflow-auto min-w-100"
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
          <DetailUserHeader data={params.id as string} />
          <div className="flex flex-col items-center gap-4 mt-4 rounded">
            <UserDetail user={data} />
            <LeaveInformationDetail />
            <ContractInline />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
