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
export default function DetailUserPage() {
  const params = useParams();
  const isMobile = useMobile();

  const fetcher = async (url: string) => {
    const response = await axiosClient.get(url);
    return response.data.result;
  };
  const { data, error, isLoading } = useSWR(`/api/users/${params.id}`, fetcher);
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
          thông tin người dùng {params.id}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
