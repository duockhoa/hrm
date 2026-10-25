"use client";

import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import service from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecord,
  WeighingRecordPerson,
} from "../types";

type Action = "qa" | "ipc";
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

function ApprovalColumn({
  title,
  approvedAt,
  approvedBy,
  busy,
  submitting,
  onApprove,
}: {
  title: string;
  approvedAt: string | null;
  approvedBy: WeighingRecordPerson | null;
  busy: boolean;
  submitting: boolean;
  onApprove: () => void;
}) {
  const approved = Boolean(approvedAt);
  return (
    <div className="flex min-h-64 flex-col items-center px-6 py-5 text-center">
      <h3 className="font-bold">{title}</h3>
      <Button
        type="button"
        variant="ghost"
        className="mt-10 h-auto gap-2 px-3 py-2 font-serif font-normal text-black hover:bg-gray-100"
        disabled={busy || approved}
        aria-pressed={approved}
        aria-label={
          approved ? `${title} đã ký duyệt` : `Ký duyệt với vai trò ${title}`
        }
        title={
          approved ? `${title} đã ký duyệt` : `Ký duyệt với vai trò ${title}`
        }
        onClick={onApprove}
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span
            aria-hidden="true"
            className={`flex size-4 items-center justify-center border ${approved ? "border-emerald-700 bg-emerald-700 text-white" : "border-black bg-white"}`}
          >
            {approved ? <Check className="size-3.5" strokeWidth={3} /> : null}
          </span>
        )}
        Đã duyệt
      </Button>
      <dl className="mt-9 w-full space-y-5">
        <div>
          <dt>Tên</dt>
          <dd className="mt-1 min-h-6 font-semibold">
            {approvedBy?.name || approvedBy?.username || "—"}
          </dd>
        </div>
        <div>
          <dt>Thời điểm duyệt</dt>
          <dd className="mt-1 min-h-6 font-semibold">
            {approvedAt ? formatDate(approvedAt) : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function WeighingRecordApprovals({
  record,
  onChanged,
}: {
  record: ProductionOrderWeighingRecord;
  onChanged: (updated: ProductionOrderWeighingRecord) => Promise<unknown>;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const perform = async (next: Action) => {
    if (busyRef.current) return;
    if (
      next === "qa" ? record.qa_staff_approved_at : record.ipc_staff_approved_at
    )
      return;
    busyRef.current = true;
    setAction(next);
    setError("");
    try {
      const updated = await (next === "qa"
        ? service.approveByQaStaff(record.id)
        : service.approveByIpcStaff(record.id));
      await onChanged(updated);
      toast.success(
        next === "qa"
          ? "Nhân viên QA đã ký duyệt phiếu cân."
          : "Nhân viên IPC đã ký duyệt phiếu cân.",
      );
    } catch (error) {
      const detail: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      const text =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.join("; ")
            : "Không thể cập nhật phê duyệt phiếu cân.";
      setError(text);
      toast.error(text);
    } finally {
      busyRef.current = false;
      setAction(null);
    }
  };

  return (
    <section className="mt-6" aria-label="Phê duyệt phiếu cân">
      {error ? (
        <p role="alert" className="px-3 py-2 font-sans text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2">
        <ApprovalColumn
          title="Nhân viên ĐBCL"
          approvedAt={record.qa_staff_approved_at}
          approvedBy={record.qaStaffApprovedBy}
          busy={action !== null}
          submitting={action === "qa"}
          onApprove={() => void perform("qa")}
        />
        <ApprovalColumn
          title="Nhân viên IPC"
          approvedAt={record.ipc_staff_approved_at}
          approvedBy={record.ipcStaffApprovedBy}
          busy={action !== null}
          submitting={action === "ipc"}
          onApprove={() => void perform("ipc")}
        />
      </div>
    </section>
  );
}
