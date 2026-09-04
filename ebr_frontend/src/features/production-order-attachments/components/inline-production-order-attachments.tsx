"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductionOrderAttachment } from "../types";
import {
  formatApprovalStatus,
  formatAttachmentType,
  formatDateTime,
  getUserLabel,
} from "../utils";

const getStatusClassName = (status?: string | null) => {
  if (status === "approved")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  if (status === "pending")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
};

function AttachmentThumbnail({ path }: { path?: string | null }) {
  if (path) {
    return (
      <AuthenticatedImage
        src={path}
        alt="Ảnh đính kèm"
        className="h-[70px] w-[70px] shrink-0"
        height={70}
        width={70}
        loading="lazy"
        objectFit="contain"
      />
    );
  }

  return (
    <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded bg-gray-200 text-gray-500">
      <ImageIcon className="size-8" />
    </div>
  );
}

export default function InlineProductionOrderAttachments({
  compact = false,
  data,
  selectedAttachmentId,
  onSelectAttachment,
}: {
  compact?: boolean;
  data: ProductionOrderAttachment[] | undefined;
  selectedAttachmentId?: string | number | null;
  onSelectAttachment?: (attachmentId: string | number) => void;
}) {
  return (
    <div
      className={
        compact
          ? "w-full min-w-0 overflow-hidden"
          : "w-full max-w-4xl min-w-0 rounded border bg-white p-4 shadow-md"
      }
    >
      {!compact ? (
        <div className="mb-4 mt-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Hình ảnh đính kèm</h2>
          {data ? (
            <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
              {data.length}
            </span>
          ) : null}
        </div>
      ) : null}

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có hình ảnh đính kèm.
        </div>
      ) : (
        <div className="max-h-[60vh] divide-y divide-gray-200 overflow-auto rounded border">
          {data.map((attachment, index) => {
            const attachmentId = attachment.id;
            const isSelectable =
              attachmentId !== undefined &&
              attachmentId !== null &&
              Boolean(onSelectAttachment);
            const isSelected =
              attachmentId !== undefined &&
              attachmentId !== null &&
              selectedAttachmentId !== undefined &&
              selectedAttachmentId !== null &&
              String(attachmentId) === String(selectedAttachmentId);
            const thumbnailPath = attachment.files?.find(
              (file) => file.file_path,
            )?.file_path;

            return (
              <div
                key={attachment.id ?? index}
                tabIndex={isSelectable ? 0 : undefined}
                role={isSelectable ? "button" : undefined}
                aria-selected={isSelected}
                className={`flex min-h-[90px] gap-3 p-2 text-left transition-colors ${
                  isSelectable ? "cursor-pointer hover:bg-gray-50" : ""
                } ${isSelected ? "bg-gray-100" : "bg-white"}`}
                onClick={() => {
                  if (isSelectable) onSelectAttachment?.(attachmentId);
                }}
                onKeyDown={(event) => {
                  if (
                    !isSelectable ||
                    (event.key !== "Enter" && event.key !== " ")
                  ) {
                    return;
                  }
                  event.preventDefault();
                  onSelectAttachment?.(attachmentId);
                }}
              >
                <AttachmentThumbnail path={thumbnailPath} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold uppercase text-gray-900">
                    {formatAttachmentType(attachment.attachment_type)}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {formatDateTime(
                      attachment.entered_at ?? attachment.created_at,
                    )}
                  </p>
                  {attachment.description ? (
                    <p className="mt-1 truncate text-sm text-gray-500">
                      {attachment.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-28 flex-col items-end gap-2 text-right">
                  <Badge
                    variant="outline"
                    className={getStatusClassName(attachment.approval_status)}
                  >
                    {formatApprovalStatus(attachment.approval_status)}
                  </Badge>
                  <p className="max-w-40 text-sm text-gray-700">
                    {getUserLabel(attachment.enteredBy)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
