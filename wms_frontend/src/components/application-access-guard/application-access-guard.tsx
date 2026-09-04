"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";
import useUserStore from "@/store/user.store";
import packageJson from "../../../package.json";

const REQUIRED_APPLICATION_KEY = "hsl";
const ALL_APPLICATIONS_URL = process.env.NEXT_PUBLIC_ALL_APPLICATIONS_URL;
const CURRENT_YEAR = new Date().getFullYear();

type UserApplication = {
  key?: string | null;
  is_active?: boolean | null;
};

const hasRequiredApplication = (
  applications: UserApplication[] | undefined,
) =>
  Boolean(
    applications?.some(
      (application) =>
        application.key?.toLowerCase() === REQUIRED_APPLICATION_KEY &&
        application.is_active !== false,
    ),
  );

export default function ApplicationAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser } = useUserStore();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { data: user } = useSWR(API_ROUTES.users.me, userService.fetcherMe);
  const userId = user?.id;
  const applicationsKey = userId
    ? API_ROUTES.users.applications(userId)
    : null;
  const { data: applications, error: applicationsError } = useSWR<
    UserApplication[]
  >(applicationsKey, () => userService.fetchUserApplications(userId));
  const isAllowed = useMemo(
    () => hasRequiredApplication(applications),
    [applications],
  );
  const hasCheckedApplications =
    applications !== undefined || applicationsError !== undefined;

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [setUser, user]);

  const handleConfirmRedirect = () => {
    if (!ALL_APPLICATIONS_URL) {
      return;
    }

    setIsRedirecting(true);
    window.location.replace(ALL_APPLICATIONS_URL);
  };

  if (!user || !hasCheckedApplications) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef6ff_100%)] p-6 pb-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute -right-24 bottom-6 h-80 w-80 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src="/dkpharmalogo.png"
            alt="DKPharma"
            width={260}
            height={112}
            priority
            className="h-auto w-[220px] sm:w-[260px]"
          />
          <div
            role="progressbar"
            aria-label="Đang tải ứng dụng"
            className="mt-8 h-[3px] w-64 overflow-hidden bg-gray-100 sm:w-72"
          >
            <div className="application-access-progress-indicator h-full w-2/5 bg-blue-600" />
          </div>
          <p className="mt-6 text-2xl font-bold tracking-[0.08em] text-blue-700 sm:text-3xl sm:tracking-[0.12em] md:text-4xl">
            HỒ SƠ LÔ ĐIỆN TỬ
          </p>
        </div>
        <footer className="absolute inset-x-0 bottom-6 z-10 px-4 text-center text-xs text-gray-500 sm:text-sm">
          Phiên bản {packageJson.version} | © {CURRENT_YEAR} DK Pharma. All
          Rights Reserved.
        </footer>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50 p-4">
        <Dialog open>
          <DialogContent
            showCloseButton={false}
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
            className="max-w-[420px]"
          >
            <DialogHeader>
              <DialogTitle>Không có quyền truy cập</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-gray-600">
                Tài khoản của bạn chưa được cấp quyền sử dụng ứng dụng Hồ sơ
                lô. Vui lòng liên hệ quản trị viên để được cấp quyền.
              </p>
              <div>
                <Button
                  type="button"
                  disabled={isRedirecting || !ALL_APPLICATIONS_URL}
                  onClick={handleConfirmRedirect}
                  className="w-full"
                >
                  {isRedirecting ? "Đang chuyển..." : "OK"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return children;
}
