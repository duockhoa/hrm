"use client";

import { FeaturesPage } from "@/features/features";
import { EquipmentPage } from "@/features/equipment";
import { FilterCatalogsPage } from "@/features/filter-catalogs";
import { ProductLinesPage } from "@/features/product-lines";
import { ProductionWorkshopsPage } from "@/features/production-workshops";
import { CleaningRequirementsPage } from "@/features/cleaning-requirements";
import { SecondaryPackagingStageRequirementsPage } from "@/features/secondary-packaging-stage-requirements";
import { DosageFormsPage } from "@/features/dosage-forms";
import { cn } from "@/lib/utils";
import {
  Factory,
  Filter,
  ClipboardCheck,
  PackageCheck,
  Pill,
  Settings,
  SlidersHorizontal,
  Warehouse,
  Wrench,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";

type SettingSection = {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const SETTING_SECTIONS: SettingSection[] = [
  {
    key: "features",
    label: "Danh mục tính năng",
    description: "Quản lý action/view chuẩn dùng để cấu hình theo mã hàng.",
    icon: SlidersHorizontal,
  },
  {
    key: "product-lines",
    label: "Dòng sản phẩm",
    description: "Quản lý danh sách dây chuyền hoặc dòng sản phẩm.",
    icon: Factory,
  },
  {
    key: "filter-catalogs",
    label: "Danh mục cột lọc",
    description: "Quản lý mã cột lọc, loại lọc và chu kỳ hấp sử dụng.",
    icon: Filter,
  },
  {
    key: "production-workshops",
    label: "Nhà xưởng",
    description: "Quản lý danh sách xưởng sản xuất.",
    icon: Warehouse,
  },
  {
    key: "equipment",
    label: "Thiết bị",
    description: "Quản lý danh sách thiết bị và thông số cần nhập.",
    icon: Wrench,
  },
  {
    key: "cleaning-requirements",
    label: "Yêu cầu vệ sinh",
    description: "Quản lý đối tượng và yêu cầu vệ sinh theo thời điểm.",
    icon: ClipboardCheck,
  },
  {
    key: "secondary-packaging-stage-requirements",
    label: "Yêu cầu bao bì cấp 2",
    description: "Quản lý giai đoạn và yêu cầu đóng gói bao bì cấp 2.",
    icon: PackageCheck,
  },
  {
    key: "dosage-forms",
    label: "Dạng bào chế",
    description: "Quản lý danh sách dạng bào chế dùng trong hệ thống.",
    icon: Pill,
  },
];

const DEFAULT_SECTION = SETTING_SECTIONS[0].key;

function SettingPlaceholder() {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
      <Settings className="mb-3 size-8 text-gray-400" />
      <h2 className="text-lg font-semibold">Chọn một mục cài đặt</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        Các nhóm cài đặt hệ thống sẽ được quản lý trong khu vực này.
      </p>
    </div>
  );
}

export default function SettingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? DEFAULT_SECTION;

  const handleSelectSection = (sectionKey: string) => {
    router.push(`/setting?section=${sectionKey}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg bg-white p-3 shadow-md">
      <div className="border-b pb-3">
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý các cấu hình vận hành của hệ thống.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-h-0 rounded-md border bg-gray-50 p-2">
          <div className="space-y-1">
            {SETTING_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.key;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => handleSelectSection(section.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md p-3 text-left transition",
                    isActive
                      ? "bg-white shadow-sm ring-1 ring-blue-100"
                      : "hover:bg-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      isActive ? "text-blue-600" : "text-gray-500",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {section.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-0 overflow-hidden">
          {activeSection === "features" && <FeaturesPage />}
          {activeSection === "product-lines" && <ProductLinesPage />}
          {activeSection === "filter-catalogs" && <FilterCatalogsPage />}
          {activeSection === "production-workshops" && (
            <ProductionWorkshopsPage />
          )}
          {activeSection === "equipment" && <EquipmentPage />}
          {activeSection === "cleaning-requirements" && (
            <CleaningRequirementsPage />
          )}
          {activeSection === "secondary-packaging-stage-requirements" && (
            <SecondaryPackagingStageRequirementsPage />
          )}
          {activeSection === "dosage-forms" && <DosageFormsPage />}
          {![
            "features",
            "product-lines",
            "filter-catalogs",
            "production-workshops",
            "equipment",
            "cleaning-requirements",
            "secondary-packaging-stage-requirements",
            "dosage-forms",
          ].includes(activeSection) && (
            <SettingPlaceholder />
          )}
        </main>
      </div>
    </div>
  );
}
