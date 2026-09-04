"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
import Image from "next/image";
import type { MixingActivityTemplate } from "../types";
import { formatBatchSize, formatDateTime, getCreatorLabel } from "../utils";
import MixingActivityTemplateStages from "./mixing-activity-template-stages";

export default function MixingActivityTemplateDetail({
  template,
  itemCode,
  itemName,
  isLoading = false,
  errorMessage,
  onClose,
  onEdit,
  onDelete,
}: {
  template: MixingActivityTemplate;
  itemCode: string;
  itemName?: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={onClose}
            title="Quay lại danh sách biểu mẫu"
            aria-label="Quay lại danh sách biểu mẫu"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
              Chi tiết biểu mẫu pha chế
            </h2>
            <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
              {itemCode}
              {itemName ? ` - ${itemName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button type="button" variant="outline" onClick={onEdit}>
            <Edit2 className="size-4" />
            Sửa
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Xóa
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 h-1 overflow-hidden rounded bg-blue-100">
          <div className="h-full w-1/2 animate-pulse rounded bg-blue-500" />
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded border bg-gray-50 p-2 sm:p-4">
        <div
          className="min-w-[760px] bg-white text-[15px] leading-6 text-black antialiased [text-rendering:optimizeLegibility]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          <table className="w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <td
                  rowSpan={3}
                  className="h-40 border border-black p-4 align-middle"
                >
                  <div className="flex h-full items-center justify-center">
                    <Image
                      src="/dkpharmalogo.png"
                      alt="DK Pharma"
                      width={130}
                      height={64}
                      className="h-auto max-h-16 w-auto object-contain"
                      priority
                    />
                  </div>
                </td>
                <td
                  rowSpan={3}
                  className="h-40 border border-black px-6 py-3 text-center align-middle text-xl font-bold uppercase leading-8"
                >
                  Theo dõi quá trình
                  <br />
                  Pha chế
                </td>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Mã hiệu: BMDB004.01
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Ngày ban hành:
                  <br />
                  23/08/2026
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Lần ban hành: 02
                </td>
              </tr>
            </tbody>
          </table>

          <table className="mt-6 w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Tên sản phẩm:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold leading-6">
                  {itemName || ""}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Mã sản phẩm:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold leading-6">
                  {itemCode}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Cỡ lô:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold leading-6">
                  {formatBatchSize(template.batch_size)} {template.unit_of_measure}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Số lô:
                </th>
                <td className="h-12 border border-black" />
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Mô tả:
                </th>
                <td
                  colSpan={3}
                  className="h-12 whitespace-pre-wrap break-words border border-black px-2 py-2 align-middle leading-6"
                >
                  {template.description || ""}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Người tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle leading-6">
                  {getCreatorLabel(template)}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Ngày tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle leading-6">
                  {formatDateTime(template.created_at)}
                </td>
              </tr>
            </tbody>
          </table>

          <MixingActivityTemplateStages templateId={template.id} />
        </div>
      </div>
    </section>
  );
}
