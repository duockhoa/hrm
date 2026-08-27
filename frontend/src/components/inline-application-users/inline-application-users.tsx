"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_ROUTES } from "@/lib/api-routes";
import { applicationsService } from "@/services/index.service";
import useUsersStore from "@/store/users.store";
import type { ApplicationUser } from "@/types/application";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";

const getAssignedUserIds = (users: ApplicationUser[]) =>
  new Set(users.map((user) => user.id));

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function ApplicationUsersInline({
  applicationId,
}: {
  applicationId: number;
}) {
  const { users, usersLoading } = useUsersStore();
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [changedUserIds, setChangedUserIds] = useState<Set<number> | null>(
    null,
  );
  const assignedUsersKey = `${API_ROUTES.applications.base}/${applicationId}/users`;
  const { data: assignedUsers = [], isLoading: assignedUsersLoading } = useSWR<
    ApplicationUser[]
  >(assignedUsersKey, () =>
    applicationsService.fetcherApplicationUsers(applicationId),
  );
  const assignedUserIds = changedUserIds ?? getAssignedUserIds(assignedUsers);
  const sortedUsers = useMemo(
    () =>
      [...users].sort((first, second) =>
        String(first.name ?? "").localeCompare(String(second.name ?? ""), "vi"),
      ),
    [users],
  );
  const isLoading = usersLoading || assignedUsersLoading;

  const toggleUser = async (userId: number) => {
    if (isSaving) {
      return;
    }

    const nextUserIds = new Set(assignedUserIds);
    if (nextUserIds.has(userId)) {
      nextUserIds.delete(userId);
    } else {
      nextUserIds.add(userId);
    }

    setChangedUserIds(nextUserIds);
    setIsSaving(true);
    setPendingUserId(userId);

    try {
      await applicationsService.syncApplicationUsers(
        applicationId,
        Array.from(nextUserIds),
      );
      await mutate(`${API_ROUTES.users.base}/${userId}/applications`);
      toast.success("Đã cập nhật người dùng của ứng dụng.");
    } catch {
      setChangedUserIds(new Set(assignedUserIds));
      toast.error("Không thể cập nhật người dùng. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
      setPendingUserId(null);
    }
  };

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          Người dùng ứng dụng
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tích chọn để thêm hoặc bớt người dùng khỏi ứng dụng.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[minmax(260px,1fr)_minmax(220px,1fr)_120px] border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
            <span>Người dùng</span>
            <span>Phòng ban / Chức vụ</span>
            <span className="text-center">Trạng thái</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Đang tải người dùng...
            </div>
          ) : sortedUsers.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">
              Chưa có người dùng nào.
            </p>
          ) : (
            sortedUsers.map((user: ApplicationUser) => {
              const isAssigned = assignedUserIds.has(user.id);
              const isPending = pendingUserId === user.id;

              return (
                <label
                  key={user.id}
                  className="grid cursor-pointer grid-cols-[minmax(260px,1fr)_minmax(220px,1fr)_120px] items-center border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {user.username}
                        {user.email ? ` · ${user.email}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="pr-4 text-sm text-slate-500">
                    {[user.department, user.position]
                      .filter(Boolean)
                      .join(" - ") || "Chưa cập nhật"}
                  </span>
                  <span className="flex justify-center">
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        disabled={isSaving}
                        onChange={() => toggleUser(user.id)}
                        aria-label={`Gán người dùng ${user.name}`}
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
