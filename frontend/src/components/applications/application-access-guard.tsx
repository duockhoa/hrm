"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { API_ROUTES } from "@/lib/api-routes";
import { userService, usersService } from "@/services/index.service";
import useSWR from "swr";

type Application = {
  key?: string | null;
};

type CurrentUser = {
  id?: number | string;
};

type ApplicationAccessGuardProps = {
  children: React.ReactNode;
  requiredKey?: string;
  redirectUrl?: string;
};

const DEFAULT_REQUIRED_KEY =
  process.env.NEXT_PUBLIC_REQUIRED_APP_KEY?.trim().toLowerCase() || "hrm";

const DEFAULT_REDIRECT_URL =
  process.env.NEXT_PUBLIC_APP_UNAUTHORIZED_REDIRECT_URL ||
  "https://dkpharma.io.vn";

export default function ApplicationAccessGuard({
  children,
  requiredKey = DEFAULT_REQUIRED_KEY,
  redirectUrl = DEFAULT_REDIRECT_URL,
}: ApplicationAccessGuardProps) {
  const normalizedRequiredKey = requiredKey.trim().toLowerCase();
  const { data: user, isLoading: isUserLoading } = useSWR<CurrentUser>(
    API_ROUTES.users.me,
    userService.fetcherMe,
  );
  const userId = user?.id ? Number(user.id) : null;
  const { data: applications = [], isLoading: isApplicationsLoading } = useSWR<
    Application[]
  >(userId ? `${API_ROUTES.users.base}/${userId}/applications` : null, () =>
    usersService.fetcherUserApplications(Number(userId)),
  );

  const hasAccess = applications.some(
    (application) =>
      application.key?.trim().toLowerCase() === normalizedRequiredKey,
  );
  const isLoading = isUserLoading || Boolean(userId && isApplicationsLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Spinner />
          <span>Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50 px-4">
        <div
          role="alertdialog"
          aria-labelledby="application-access-title"
          aria-describedby="application-access-description"
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-lg"
        >
          <h2
            id="application-access-title"
            className="text-lg font-semibold text-slate-900"
          >
            Không có quyền truy cập
          </h2>
          <p
            id="application-access-description"
            className="mt-3 text-sm leading-6 text-slate-600"
          >
            Tài khoản của bạn chưa được cấp quyền truy cập ứng dụng HRM.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => window.location.replace(redirectUrl)}
          >
            OK
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
