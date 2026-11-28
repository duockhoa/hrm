"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import VerificationRecordDetail from "./verification-record-detail";
import VerificationRecords from "./verification-records";

export default function VerificationRecordSplit({ id }: { id: number }) {
  const isMobile = useMobile();
  const isTablet = useTablet();

  if (isMobile) {
    return (
      <div className="h-full overflow-auto rounded-lg bg-white p-2 shadow-md">
        <VerificationRecordDetail key={id} id={id} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup key={isTablet ? "tablet" : "desktop"}>
        <ResizablePanel
          id="verification-list"
          defaultSize={isTablet ? "25%" : "30%"}
          minSize={isTablet ? "20%" : "30%"}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          <VerificationRecords selectedId={id} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          id="verification-detail"
          defaultSize={isTablet ? "75%" : "70%"}
          minSize="0%"
          className="min-h-0 min-w-0 overflow-hidden"
        >
          <div className="h-full overflow-auto p-2 md:p-4">
            <VerificationRecordDetail key={id} id={id} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
