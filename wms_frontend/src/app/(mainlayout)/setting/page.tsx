import { Suspense } from "react";
import SettingPage from "@/features/manufacturers/setting-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-gray-500">Đang tải cài đặt...</div>
      }
    >
      <SettingPage />
    </Suspense>
  );
}
