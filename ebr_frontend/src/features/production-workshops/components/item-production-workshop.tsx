"use client";

import { cn } from "@/lib/utils";
import { MapPin, Warehouse } from "lucide-react";
import type { ProductionWorkshop } from "../types";

type ItemProductionWorkshopProps = {
  workshop: ProductionWorkshop | null;
  isActive?: boolean;
  onClick: () => void;
};

export default function ItemProductionWorkshop({
  workshop,
  isActive = false,
  onClick,
}: ItemProductionWorkshopProps) {
  if (!workshop) {
    return (
      <div className="rounded-md border border-gray-100 bg-white p-3">
        <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-5 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-100" />
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
            isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600",
          )}
        >
          <Warehouse className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
              {workshop.code}
            </span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold">
            {workshop.name}
          </div>
          {workshop.address ? (
            <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-500">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{workshop.address}</span>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
