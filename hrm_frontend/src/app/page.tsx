"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardCheck,
  Clock3,
  Wrench,
  Package,
  UserCog,
} from "lucide-react";
import useSWR from "swr";
import HeaderApps from "@/components/applications/header-apps";
import ItemApp from "@/components/applications/item-app";
import { API_ROUTES } from "@/lib/api-routes";
import { userService, usersService } from "@/services/index.service";
import useUserStore from "@/store/user.store";
import useMobile from "@/hooks/use-mobile";

type AppLauncherItem = {
  key: string;
  name: string;
  link: string;
  icon: LucideIcon;
  tileClassName: string;
};

type Application = {
  key?: string | null;
};

type CurrentUser = {
  id?: number | string;
  name?: string | null;
};

const ACCESS_CONTROLLED_APP_KEYS = new Set([
  "equipment",
  "hsl",
  "hrm",
  "wms",
  "scb",
]);

const APPS: AppLauncherItem[] = [
  {
    key: "request",
    name: "DK REQUEST",
    link: process.env.NEXT_PUBLIC_APP_REQUEST_URL || "#",
    icon: Clock3,
    tileClassName:
      "bg-[linear-gradient(180deg,#59BEFF_0%,#3096F4_58%,#2C72E7_100%)]",
  },

  {
    key: "hsl",
    name: "HSL ONLINE",
    link: process.env.NEXT_PUBLIC_APP_EBR_URL || "",
    icon: ClipboardCheck,
    tileClassName:
      "bg-[linear-gradient(180deg,#64D45F_0%,#42AF4F_56%,#2D8A3A_100%)]",
  },
  {
    key: "wms",
    name: "KHO DƯỢC KHOA",
    link: process.env.NEXT_PUBLIC_APP_WMS_URL || "",
    icon: Building2,
    tileClassName:
      "bg-[linear-gradient(180deg,#FFB11D_0%,#F08D00_55%,#D66A00_100%)]",
  },
  {
    key: "hrm",
    name: "DK HRM",
    link: "/home",
    icon: UserCog,
    tileClassName:
      "bg-[linear-gradient(180deg,#267BFF_0%,#1B59CC_60%,#1243A5_100%)]",
  },
  {
    key: "equipment",
    name: "QUẢN LÝ THIẾT BỊ",
    link: process.env.NEXT_PUBLIC_APP_EQUIPMENT_URL || "#",
    icon: Wrench,
    tileClassName:
      "bg-[linear-gradient(180deg,#8B7CFF_0%,#6657D8_58%,#4638A7_100%)]",
  },

  {
    key: "scb",
    name: "SCB",
    link: process.env.NEXT_PUBLIC_APP_SCB_URL || "#", // Dùng biến môi trường
    icon: Package,
    tileClassName:
      "bg-[linear-gradient(180deg,#FF6B6B_0%,#E63946_50%,#D90429_100%)]",
  },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SECOND_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  second: "2-digit",
});

export default function Home() {
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());
  const { user } = useUserStore();
  const isMobile = useMobile();
  const { data: currentUser } = useSWR<CurrentUser>(
    API_ROUTES.users.me,
    userService.fetcherMe,
  );
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;
  const { data: userApplications = [] } = useSWR<Application[]>(
    currentUserId
      ? `${API_ROUTES.users.base}/${currentUserId}/applications`
      : null,
    () => usersService.fetcherUserApplications(Number(currentUserId)),
  );
  const allowedApplicationKeys = new Set(
    userApplications
      .map((application) => application.key?.trim().toLowerCase())
      .filter(Boolean),
  );

  useEffect(() => {
    document.title = "DKPHARMA APP";

    return () => {
      document.title = "DK HRM";
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredApps = APPS.filter((app) =>
    app.name.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031125] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#082C57_0%,#041730_38%,#020B17_100%)]" />
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_24px_32px,rgba(255,255,255,0.95),transparent),radial-gradient(1.4px_1.4px_at_76px_124px,rgba(191,219,254,0.9),transparent),radial-gradient(1px_1px_at_150px_56px,rgba(255,255,255,0.7),transparent),radial-gradient(1px_1px_at_88px_176px,rgba(255,255,255,0.75),transparent)] [background-size:180px_180px]" />
      <div className="absolute inset-x-0 top-[-12%] h-[48vh] bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.24)_0%,rgba(37,99,235,0.16)_32%,transparent_72%)] blur-3xl" />
      <div className="absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/20 blur-[140px]" />
      <div className="absolute inset-x-[8%] bottom-[-26vh] h-[58vh] rounded-t-[55%] bg-[linear-gradient(180deg,rgba(59,130,246,0.82)_0%,rgba(6,95,158,0.56)_7%,rgba(2,26,53,0.94)_28%,rgba(2,10,24,1)_100%)] shadow-[0_-15px_120px_rgba(56,189,248,0.35)]" />
      <div className="absolute inset-x-[20%] bottom-[19vh] h-24 bg-[radial-gradient(circle,rgba(191,219,254,0.85)_0%,rgba(59,130,246,0.38)_24%,transparent_68%)] blur-3xl" />
      <div className="absolute inset-x-[-4%] bottom-[21vh] h-[2px] bg-gradient-to-r from-transparent via-sky-300/80 to-transparent shadow-[0_0_32px_rgba(125,211,252,0.8)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <HeaderApps
          variant="hero"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <main className="flex flex-1 flex-col px-4 pb-8 pt-4 md:px-10 md:pb-10 md:pt-6">
          <section className="flex flex-1 flex-col items-center">
            <div className="mt-4 text-center md:mt-6">
              <div className="flex items-start justify-center gap-2 font-semibold tracking-tight">
                <span className="text-5xl md:text-7xl">
                  {TIME_FORMATTER.format(now)}
                </span>
                <span className="pt-1 text-xl text-sky-100/85 md:pt-2 md:text-3xl">
                  {SECOND_FORMATTER.format(now)}
                </span>
              </div>

              <p className="mt-4 text-xs uppercase tracking-[0.28em] text-white/70 md:text-sm">
                {DATE_FORMATTER.format(now).toUpperCase()}
              </p>
            </div>

            <div className="mt-10 grid w-full max-w-4xl grid-cols-3 place-items-center gap-x-2 gap-y-8 sm:grid-cols-3 md:mt-12 md:grid-cols-5 md:gap-x-10">
              {filteredApps.map((app) => {
                const Icon = app.icon;
                const hasAccess =
                  !ACCESS_CONTROLLED_APP_KEYS.has(app.key) ||
                  allowedApplicationKeys.has(app.key);

                return (
                  <ItemApp
                    key={app.key}
                    link={app.link}
                    name={app.name}
                    tileClassName={app.tileClassName}
                    disabled={!hasAccess}
                    icon={
                      <Icon className="size-10 text-white" strokeWidth={2.4} />
                    }
                  />
                );
              })}
            </div>

            {filteredApps.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75 backdrop-blur-md">
                Không tìm thấy ứng dụng phù hợp với từ khóa &quot;{search}
                &quot;.
              </div>
            ) : null}
            {!isMobile && (
              <div className="mt-auto w-full max-w-4xl pt-16">
                <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,20,48,0.7)_0%,rgba(2,10,24,0.42)_100%)] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-md md:px-8 md:py-9">
                  <p className="text-xs uppercase tracking-[0.35em] text-sky-200/70">
                    Dashboard
                  </p>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                    Xin chào {currentUser?.name ?? user?.name ?? "bạn"}!
                  </h2>
                  <div className="mt-6 h-px bg-gradient-to-r from-sky-300/40 via-white/12 to-transparent" />

                  <div className="mt-6 max-w-2xl space-y-3 text-sm leading-7 text-white/78 md:text-base">
                    <p className="font-semibold text-white/90">
                      Thông điệp hôm nay
                    </p>
                    <p>
                      Mỗi ngày làm việc là một bước tiến gần hơn đến mục tiêu
                      chung của đội ngũ.
                    </p>
                    <p>
                      Giữ nhịp làm việc rõ ràng, xử lý gọn từng đầu việc và hoàn
                      thành tốt trong hôm nay.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <footer className="pt-8 text-center text-xs text-white/55 md:text-sm">
            © {now.getFullYear()} DK Pharma. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}
