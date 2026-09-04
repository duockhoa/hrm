"use client";

import { Button } from "@/components/ui/button";
import productionOrderMixingRecordsService from "@/services/production-order-mixing-records.service";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ProductionOrderMixingRecord } from "../types";
import { formatRecordDateTime, getPersonLabel } from "../utils";

type ApprovalRole = "qa-staff" | "ipc-staff";

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "Không thể ký duyệt phiếu pha chế.";

function ApprovalColumn({
  title,
  approvedAt,
  approvedBy,
  isSubmitting,
  onApprove,
}: {
  title: string;
  approvedAt?: string | null;
  approvedBy: string;
  isSubmitting: boolean;
  onApprove: () => void;
}) {
  const isApproved = Boolean(approvedAt);

  return (
    <div className="flex min-h-64 flex-col items-center px-6 py-5 text-center">
      <h3 className="font-bold">{title}</h3>

      <Button
        type="button"
        variant="ghost"
        className="mt-10 h-auto gap-2 px-3 py-2 font-serif font-normal text-black hover:bg-gray-100"
        disabled={isSubmitting || isApproved}
        aria-pressed={isApproved}
        title={isApproved ? `${title} đã ký duyệt` : `Ký duyệt với vai trò ${title}`}
        onClick={onApprove}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span
            className={`flex size-4 items-center justify-center border ${
              isApproved ? "border-emerald-700 bg-emerald-700 text-white" : "border-black bg-white"
            }`}
            aria-hidden="true"
          >
            {isApproved ? <Check className="size-3.5" strokeWidth={3} /> : null}
          </span>
        )}
        Đã duyệt
      </Button>

      <dl className="mt-9 w-full space-y-5">
        <div>
          <dt>Tên</dt>
          <dd className="mt-1 min-h-6 font-semibold">{approvedBy || "—"}</dd>
        </div>
        <div>
          <dt>Thời điểm duyệt</dt>
          <dd className="mt-1 min-h-6 font-semibold">
            {approvedAt ? formatRecordDateTime(approvedAt) : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function MixingRecordApprovals({
  record,
  onChanged,
}: {
  record: ProductionOrderMixingRecord;
  onChanged: () => Promise<unknown>;
}) {
  const [submittingRoles, setSubmittingRoles] = useState<ApprovalRole[]>([]);
  const qaStaffApprovedBy = getPersonLabel(
    record.qaStaffApprovedBy ?? record.qa_staff_approved_by,
  );
  const ipcStaffApprovedBy = getPersonLabel(record.ipcStaffApprovedBy);

  const approve = async (role: ApprovalRole) => {
    setSubmittingRoles((current) => [...current, role]);
    try {
      if (role === "qa-staff") {
        await productionOrderMixingRecordsService.approveByQaStaff(record.id);
      } else {
        await productionOrderMixingRecordsService.approveByIpcStaff(record.id);
      }
      toast.success(
        role === "qa-staff"
          ? "Nhân viên QA đã ký duyệt phiếu."
          : "Nhân viên IPC đã ký duyệt phiếu.",
      );
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingRoles((current) => current.filter((item) => item !== role));
    }
  };

  return (
    <section className="mt-6" aria-label="Phê duyệt phiếu pha chế">
      <div className="grid grid-cols-2">
        <ApprovalColumn
          title="Nhân viên ĐBCL"
          approvedAt={record.qa_staff_approved_at}
          approvedBy={qaStaffApprovedBy}
          isSubmitting={submittingRoles.includes("qa-staff")}
          onApprove={() => void approve("qa-staff")}
        />
        <ApprovalColumn
          title="Nhân viên IPC"
          approvedAt={record.ipc_staff_approved_at}
          approvedBy={ipcStaffApprovedBy}
          isSubmitting={submittingRoles.includes("ipc-staff")}
          onApprove={() => void approve("ipc-staff")}
        />
      </div>
    </section>
  );
}
