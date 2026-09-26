"use client";

import { EquipmentOperationList } from "@/features/equipment-operation-ledger";

export default function EquipmentOperationRecordsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-md">
      <EquipmentOperationList />
    </div>
  );
}
