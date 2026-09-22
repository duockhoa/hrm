"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import type { Equipment } from "@/features/equipment/types";

type EquipmentOperationItemProps = {
  equipment: Equipment | null;
  isActive?: boolean;
  onClick: () => void;
};

export default function EquipmentOperationItem({
  equipment,
  isActive = false,
  onClick,
}: EquipmentOperationItemProps) {
  if (!equipment) {
    return (
      <div className="rounded-md border border-gray-100 bg-white p-3">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border bg-white p-3 text-left transition",
        isActive
          ? "border-blue-200 bg-blue-50 shadow-sm ring-1 ring-blue-100"
          : "border-gray-100 hover:border-blue-100 hover:bg-blue-50/50",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md",
            isActive
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600",
          )}
        >
          <Settings className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
            {equipment.code}
          </span>
          <div className="mt-2 truncate text-sm font-semibold text-gray-900">
            {equipment.name}
          </div>
        </div>
      </div>
    </button>
  );
}
