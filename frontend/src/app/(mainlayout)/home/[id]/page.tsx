"use client";
import DetailUserHeader from "@/components/detail-user-header/detail-user-header";
import { useParams } from "next/navigation";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import HomePage from "../page";
import useMobile from "@/hooks/use-mobile";
export default function DetailUserPage() {
  const params = useParams();   
  const isMobile = useMobile();
  return (
    <div className="h-[100%] bg-white rounded-lg shadow-md p-4 overflow-auto">   
     <ResizablePanelGroup   >  
        {!isMobile && (
                  <ResizablePanel defaultSize={20}  className="overflow-auto min-w-100">
       <HomePage />
      </ResizablePanel>
        )}
        {!isMobile && (
      <ResizableHandle />
        )}
      <ResizablePanel defaultSize={isMobile ? 100 : 50}>
        <DetailUserHeader id={params.id as string} />
       Việt Nam
      </ResizablePanel>
     
     </ResizablePanelGroup>
    </div>


  );
}