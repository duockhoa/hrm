"use client";

import {
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import useSWR from "swr";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import service, {
  type VerificationDefect,
  verificationDefectLabels,
} from "@/services/warehouse-verification-records.service";
import VerificationDefectDialog, {
  type DefectAction,
} from "./verification-defect-dialog";
import {
  formatVerificationDate,
  verificationError,
} from "./verification-record-format";

const fieldPanelClass =
  "flex flex-col gap-3 rounded border bg-white p-3 text-sm shadow-md md:gap-4 md:p-4 [--field-label-width:112px] sm:[--field-label-width:140px] md:[--field-label-width:170px] [&_p]:whitespace-pre-wrap";

const quantityFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 3,
});

export default function VerificationRecordDetail({ id }: { id: number }) {
  const {
    data: record,
    error,
    mutate,
  } = useSWR(
    API_ROUTES.warehouseVerificationRecords.detail(id),
    () => service.read(id),
    { shouldRetryOnError: false },
  );
  const [action, setAction] = useState<DefectAction | null>(null);
  const defectsHeading = useRef<HTMLHeadingElement>(null);
  const receipt = record?.warehouseReceiptItem;
  const order = record?.productionOrder;
  const defects = record?.details ?? [];
  const subjectType = receipt ? "Hàng nhập kho" : order ? "Lệnh sản xuất" : "";
  const subjectFields = [
    ["Loại đối tượng", subjectType],
    receipt
      ? ["Dòng nhập kho", "#" + receipt.id]
      : [
          "Mã lệnh sản xuất",
          order?.production_order_code || (order ? "#" + order.id : ""),
        ],
    ["Mã hàng", receipt?.item_code ?? order?.item_code],
    ["Tên hàng", receipt?.item.item_name ?? order?.item.item_name],
    ["Số lô", receipt?.lot_number ?? order?.lot_no],
    receipt
      ? ["Thời điểm nhập kho", formatVerificationDate(receipt.received_at)]
      : [
          "Thời điểm tạo lệnh",
          order ? formatVerificationDate(order.creation_date) : "",
        ],
  ];

  function updateDefects(saved: VerificationDefect | null, removedId?: number) {
    setAction(null);
    void mutate(
      (current) => {
        if (!current) return current;
        const details = (current.details ?? []).filter(
          (defect) => defect.id !== (saved?.id ?? removedId),
        );
        if (saved) details.push(saved);
        return {
          ...current,
          details: details.sort((first, second) => first.id - second.id),
        };
      },
      { revalidate: false },
    );
  }

  return (
    <section aria-label="Chi tiết biên bản xác minh">
      <header className="flex w-full items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex min-w-0 items-center gap-2 text-sm sm:text-base">
          <Link
            href="/verification-records"
            scroll={false}
            className="shrink-0 hover:underline"
          >
            Biên bản xác minh
          </Link>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate" title={record?.record_code}>
            {record?.record_code ?? "Chi tiết"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {record && !error && (
            <Button
              type="button"
              className="h-9 bg-gray-950 px-2 text-white hover:bg-gray-800 sm:px-3"
              aria-label="Thêm chi tiết lỗi"
              onClick={() => setAction({ type: "add" })}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Thêm chi tiết lỗi</span>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link
              href="/verification-records"
              scroll={false}
              aria-label="Đóng chi tiết"
              title="Đóng chi tiết"
            >
              <X className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto mt-2 flex w-full max-w-4xl flex-col gap-2 md:mt-4 md:gap-4">
        {error ? (
          <div className="flex flex-wrap items-center gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p role="alert">
              {verificationError(error, "Không thể tải biên bản.")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void mutate()}
            >
              Thử lại
            </Button>
          </div>
        ) : !record ? (
          <div
            role="status"
            aria-label="Đang tải biên bản"
            className="space-y-4 rounded border bg-white p-4 shadow-md"
          >
            <Skeleton className="mx-auto h-9 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded border bg-white p-3 text-center shadow-md md:gap-8 md:p-4">
              <h1 className="break-words text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
                Biên bản xác minh - {record.record_code}
              </h1>
              <div className="grid w-full grid-cols-4 justify-items-center gap-1 md:grid-cols-[repeat(auto-fill,minmax(90px,1fr))] md:gap-2">
                <button
                  type="button"
                  data-has-data={defects.length > 0}
                  className="group inline-flex flex-col items-center rounded p-0.5 focus-visible:outline-2 focus-visible:outline-blue-600 md:p-1"
                  onClick={() => {
                    defectsHeading.current?.scrollIntoView({ block: "start" });
                    defectsHeading.current?.focus({ preventScroll: true });
                  }}
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-blue-500 text-white group-hover:bg-blue-600 group-data-[has-data=true]:bg-green-500 group-data-[has-data=true]:group-hover:bg-green-600 md:size-10">
                    <ClipboardList className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-1 w-[68px] text-center text-xs font-semibold leading-tight text-gray-700 md:w-[90px] md:text-sm">
                    Chi tiết lỗi
                  </span>
                </button>
              </div>
            </div>

            <section
              aria-label="Thông tin biên bản"
              className={fieldPanelClass}
            >
              <FieldDisplay lable="Mã biên bản" value={record.record_code} />
              <FieldDisplay lable="Địa điểm lập" value={record.location} />
              <FieldDisplay
                lable="Người lập"
                value={record.createdBy.name || record.createdBy.username}
              />
              <FieldDisplay
                lable="Người tham gia"
                value={
                  record.participants
                    ?.map(({ user }) => user.name || user.username)
                    .join(", ") || "—"
                }
              />
              <FieldDisplay
                lable="Thời điểm tạo"
                value={formatVerificationDate(record.created_at)}
              />
              <FieldDisplay
                lable="Cập nhật lần cuối"
                value={formatVerificationDate(record.updated_at)}
              />
              {subjectType ? (
                <div className="flex flex-col gap-3 border-t pt-3 md:gap-4 md:pt-4">
                  {subjectFields.map(([label, value]) => (
                    <FieldDisplay
                      key={label}
                      lable={label || ""}
                      value={value || "—"}
                    />
                  ))}
                </div>
              ) : (
                <FieldDisplay lable="Đối tượng xác minh" value="—" />
              )}
            </section>

            <div className={fieldPanelClass}>
              <h2
                ref={defectsHeading}
                tabIndex={-1}
                className="scroll-mt-2 border-b pb-2 font-semibold"
              >
                Chi tiết lỗi
              </h2>
              {defects.length === 0 ? (
                <p className="text-gray-600">Chưa có chi tiết lỗi.</p>
              ) : (
                defects.map((defect) => (
                  <article
                    key={defect.id}
                    className="flex flex-col gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 break-words font-semibold">
                        {defect.defect_description}
                      </h3>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Sửa lỗi ${defect.defect_description}`}
                          title="Sửa chi tiết lỗi"
                          onClick={() => setAction({ type: "edit", defect })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-600"
                          aria-label={`Xóa lỗi ${defect.defect_description}`}
                          title="Xóa chi tiết lỗi"
                          onClick={() => setAction({ type: "delete", defect })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <FieldDisplay
                      lable="Số lượng xác minh"
                      value={quantityFormatter.format(
                        Number(defect.verified_quantity),
                      )}
                    />
                    <FieldDisplay
                      lable="Số lượng lỗi"
                      value={quantityFormatter.format(
                        Number(defect.defect_quantity),
                      )}
                    />
                    <FieldDisplay
                      lable="Loại sai lỗi"
                      value={verificationDefectLabels[defect.defect_type]}
                    />
                    <FieldDisplay
                      lable="Đề nghị xử lý"
                      value={defect.proposed_action || "—"}
                    />
                    <FieldDisplay lable="Ghi chú" value={defect.note || "—"} />
                    <FieldDisplay
                      lable="Người nhập"
                      value={defect.createdBy.name || defect.createdBy.username}
                    />
                    <FieldDisplay
                      lable="Thời điểm nhập"
                      value={formatVerificationDate(defect.created_at)}
                    />
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        {action && (
          <VerificationDefectDialog
            recordId={id}
            action={action}
            onClose={() => setAction(null)}
            onSaved={updateDefects}
          />
        )}
      </Dialog>
    </section>
  );
}
