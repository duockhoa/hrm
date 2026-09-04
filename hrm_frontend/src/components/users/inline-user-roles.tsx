"use client";

import { API_ROUTES } from "@/lib/api-routes";
import { rolesService, usersService } from "@/services/index.service";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

type Role = {
  id: number;
  name: string;
  description?: string | null;
};

type UserRole = {
  roles?: Role | null;
};

const getAssignedRoleIds = (userRoles: UserRole[]) =>
  new Set(
    userRoles
      .map((userRole) => userRole.roles?.id)
      .filter((roleId): roleId is number => typeof roleId === "number"),
  );

export default function UserRolesInline({ userId }: { userId: number }) {
  const [pendingRoleIds, setPendingRoleIds] = useState<Set<number>>(new Set());
  const [changedRoleIds, setChangedRoleIds] = useState<Set<number> | null>(
    null,
  );
  const { data: roles = [], isLoading: rolesLoading } = useSWR<Role[]>(
    API_ROUTES.roles.base,
    rolesService.fetcherRoles,
  );
  const userRolesKey = `${API_ROUTES.users.base}/${userId}/roles`;
  const { data: userRoles = [], isLoading: userRolesLoading } = useSWR<
    UserRole[]
  >(userRolesKey, () => usersService.fetcherUserRoles(userId));

  const assignedRoleIds = changedRoleIds ?? getAssignedRoleIds(userRoles);
  const isLoading = rolesLoading || userRolesLoading;

  const toggleRole = async (roleId: number) => {
    if (pendingRoleIds.has(roleId)) {
      return;
    }

    const wasAssigned = assignedRoleIds.has(roleId);
    const nextRoleIds = new Set(assignedRoleIds);
    if (wasAssigned) {
      nextRoleIds.delete(roleId);
    } else {
      nextRoleIds.add(roleId);
    }

    // Update the displayed checkbox immediately. The click then performs one
    // add/remove request only; we do not refetch the role list after toggling.
    setChangedRoleIds(nextRoleIds);
    setPendingRoleIds((current) => new Set(current).add(roleId));

    try {
      if (wasAssigned) {
        await usersService.removeUserRole(userId, roleId);
        toast.success("Đã gỡ vai trò khỏi người dùng.");
      } else {
        await usersService.addUserRole(userId, roleId);
        toast.success("Đã gán vai trò cho người dùng.");
      }
    } catch {
      setChangedRoleIds(new Set(assignedRoleIds));
      toast.error("Không thể cập nhật vai trò. Vui lòng thử lại.");
    } finally {
      setPendingRoleIds((current) => {
        const next = new Set(current);
        next.delete(roleId);
        return next;
      });
    }
  };

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          Vai trò người dùng
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tích chọn để cấp hoặc gỡ từng vai trò cho người dùng.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_120px] border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
            <span>Vai trò</span>
            <span>Mô tả</span>
            <span className="text-center">Trạng thái</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Đang tải vai trò...
            </div>
          ) : roles.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">
              Chưa có vai trò nào.
            </p>
          ) : (
            roles.map((role) => {
              const isAssigned = assignedRoleIds.has(role.id);
              const isPending = pendingRoleIds.has(role.id);

              return (
                <label
                  key={role.id}
                  className="grid cursor-pointer grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_120px] items-center border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">
                    {role.name}
                  </span>
                  <span className="pr-4 text-sm text-slate-500">
                    {role.description || "Chưa có mô tả"}
                  </span>
                  <span className="flex justify-center">
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        disabled={isPending}
                        onChange={() => toggleRole(role.id)}
                        aria-label={`Gán vai trò ${role.name}`}
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
