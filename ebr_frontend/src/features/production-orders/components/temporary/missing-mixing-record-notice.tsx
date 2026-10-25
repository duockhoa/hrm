"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import mixingRecordsService from "@/services/production-order-mixing-records.service";

const NoticeVisitContext = createContext<{
  status: "pending" | "open" | "done";
  resolve: (missing: boolean) => void;
  dismiss: () => void;
} | null>(null);

function NoticeVisit({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"pending" | "open" | "done">("pending");
  const resolve = useCallback((missing: boolean) => {
    setStatus((current) =>
      current === "pending" ? (missing ? "open" : "done") : current,
    );
  }, []);
  return (
    <NoticeVisitContext.Provider
      value={{ status, resolve, dismiss: () => setStatus("done") }}
    >
      {children}
    </NoticeVisitContext.Provider>
  );
}

// Keep dismissal through form/detail remounts; reset only on pathname changes.
export function MissingMixingRecordNoticeScope({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  return <NoticeVisit key={pathname}>{children}</NoticeVisit>;
}

// Temporary reminder for BTP lots. To retire it, delete this file, remove its
// call/import in detail-product-order.tsx and unwrap the scope in mainlayout.
export default function MissingMixingRecordNotice({
  productionOrderId,
  creationDate,
}: {
  productionOrderId: string | number;
  creationDate?: string | null;
}) {
  const visit = useContext(NoticeVisitContext);
  if (!visit)
    throw new Error("MissingMixingRecordNotice requires its route scope");
  const { status, resolve, dismiss } = visit;
  const [today] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
      new Date(),
    ),
  );
  const createdAt = creationDate ? new Date(creationDate) : null;
  const createdDay =
    createdAt !== null && !Number.isNaN(createdAt.getTime())
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(createdAt)
      : null;
  // Strictly after October 1, excluding today and any future creation dates.
  const isEligibleDate =
    createdDay !== null && createdDay > "2026-10-01" && createdDay < today;
  const [memeNumber] = useState(() => Math.floor(Math.random() * 5) + 1);
  const {
    data: records,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    status === "pending" && isEligibleDate
      ? API_ROUTES.productionOrders.mixingRecords(productionOrderId)
      : null,
    () => mixingRecordsService.fetchAllByProductionOrderId(productionOrderId),
    { revalidateOnMount: true },
  );
  // Evaluate once per pathname, after a successful refreshed response. Later
  // form edits, refetches and component remounts must not trigger the reminder.
  useEffect(() => {
    if (
      status === "pending" &&
      isEligibleDate &&
      records &&
      !error &&
      !isLoading &&
      !isValidating
    ) {
      resolve(records.length === 0);
    }
  }, [status, isEligibleDate, records, error, isLoading, isValidating, resolve]);

  return (
    <Dialog
      open={status === "open" && isEligibleDate}
      onOpenChange={(value) => {
        if (!value) dismiss();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto font-sans sm:max-w-md">
        <DialogHeader className="items-center gap-3 text-center sm:text-center">
          <DialogTitle className="text-2xl font-bold">Thông báo</DialogTitle>
          <DialogDescription className="w-full rounded-lg bg-amber-50 px-4 py-3 text-center text-base font-semibold leading-relaxed text-red-600 ring-1 ring-inset ring-amber-200">
            Có vẻ chưa có phiếu pha chế cho lô này
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <Image
            src={`/memes/meme_${memeNumber}.jpg`}
            alt="Meme nhắc bạn chưa tạo phiếu pha chế"
            width={554}
            height={554}
            sizes="240px"
            className="max-h-[32dvh] w-60 rounded-lg object-contain"
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={dismiss}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
