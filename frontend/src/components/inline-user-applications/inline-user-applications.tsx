"use client";

import { API_ROUTES } from "@/lib/api-routes";
import { applicationsService, usersService } from "@/services/index.service";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

type Application = {
  id: number;
  key: string;
  name: string;
  description?: string | null;
};

const getAssignedApplicationIds = (applications: Application[]) =>
  new Set(applications.map((application) => application.id));

export default function UserApplicationsInline({ userId }: { userId: number }) {
  const [isSaving, setIsSaving] = useState(false);
  const [pendingApplicationId, setPendingApplicationId] = useState<
    number | null
  >(null);
  const [changedApplicationIds, setChangedApplicationIds] = useState<
    Set<number> | null
  >(null);
  const { data: applications = [], isLoading: applicationsLoading } = useSWR<
    Application[]
  >(`${API_ROUTES.applications.base}?includeInactive=false`, () =>
    applicationsService.fetcherApplications(false),
  );
  const userApplicationsKey = `${API_ROUTES.users.base}/${userId}/applications`;
  const { data: userApplications = [], isLoading: userApplicationsLoading } =
    useSWR<Application[]>(userApplicationsKey, () =>
      usersService.fetcherUserApplications(userId),
    );

  const assignedApplicationIds =
    changedApplicationIds ?? getAssignedApplicationIds(userApplications);
  const isLoading = applicationsLoading || userApplicationsLoading;

  const toggleApplication = async (applicationId: number) => {
    if (isSaving) {
      return;
    }

    const nextApplicationIds = new Set(assignedApplicationIds);
    if (nextApplicationIds.has(applicationId)) {
      nextApplicationIds.delete(applicationId);
    } else {
      nextApplicationIds.add(applicationId);
    }

    // The API currently syncs the assigned list, so one checkbox click sends
    // one PUT request with the next complete list and does not refetch it.
    setChangedApplicationIds(nextApplicationIds);
    setIsSaving(true);
    setPendingApplicationId(applicationId);

    try {
      await usersService.syncUserApplications(
        userId,
        Array.from(nextApplicationIds),
      );
      toast.success("Đã cập nhật quyền truy cập ứng dụng.");
    } catch {
      setChangedApplicationIds(new Set(assignedApplicationIds));
      toast.error("Không thể cập nhật ứng dụng. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
      setPendingApplicationId(null);
    }
  };

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          Phân quyền ứng dụng
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tích chọn ứng dụng người dùng được phép truy cập.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_120px] border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
            <span>Ứng dụng</span>
            <span>Mô tả</span>
            <span className="text-center">Trạng thái</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Đang tải ứng dụng...
            </div>
          ) : applications.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">
              Chưa có ứng dụng đang hoạt động.
            </p>
          ) : (
            applications.map((application) => {
              const isAssigned = assignedApplicationIds.has(application.id);
              const isPending = pendingApplicationId === application.id;

              return (
                <label
                  key={application.id}
                  className="grid cursor-pointer grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_120px] items-center border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                >
                  <span>
                    <span className="block font-medium text-slate-900">
                      {application.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-500">
                      {application.key}
                    </span>
                  </span>
                  <span className="pr-4 text-sm text-slate-500">
                    {application.description || "Chưa có mô tả"}
                  </span>
                  <span className="flex justify-center">
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        disabled={isSaving}
                        onChange={() => toggleApplication(application.id)}
                        aria-label={`Cấp quyền ứng dụng ${application.name}`}
                        className="size-4 cursor-pointer rounded border-slate-400 accent-blue-600 disabled:cursor-not-allowed"
                      />
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
