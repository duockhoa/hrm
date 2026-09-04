"use client";

import { API_ROUTES } from "@/lib/api-routes";
import { permissionsService, rolesService } from "@/services/index.service";
import type { Permission, Role } from "@/types/role";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

const getAssignedPermissionIds = (role?: Role) =>
  new Set(
    role?.rolePermissions
      ?.map((rolePermission) => rolePermission.permissions?.id)
      .filter((id): id is number => typeof id === "number") ?? [],
  );

export default function RolePermissionsInline({ roleId }: { roleId: number }) {
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPermissionId, setPendingPermissionId] = useState<number | null>(
    null,
  );
  const [changedPermissionIds, setChangedPermissionIds] =
    useState<Set<number> | null>(null);
  const roleKey = `${API_ROUTES.roles.base}/${roleId}`;
  const { data: role, isLoading: roleLoading } = useSWR<Role>(roleKey, () =>
    rolesService.fetcherRoleById(roleId),
  );
  const { data: permissions = [], isLoading: permissionsLoading } = useSWR<
    Permission[]
  >(API_ROUTES.permissions.base, permissionsService.fetcherPermissions);
  const assignedPermissionIds =
    changedPermissionIds ?? getAssignedPermissionIds(role);
  const sortedPermissions = useMemo(
    () =>
      [...permissions].sort((first, second) =>
        first.name.localeCompare(second.name, "vi"),
      ),
    [permissions],
  );
  const isLoading = roleLoading || permissionsLoading;

  const togglePermission = async (permissionId: number) => {
    if (isSaving) {
      return;
    }

    const nextPermissionIds = new Set(assignedPermissionIds);
    if (nextPermissionIds.has(permissionId)) {
      nextPermissionIds.delete(permissionId);
    } else {
      nextPermissionIds.add(permissionId);
    }

    setChangedPermissionIds(nextPermissionIds);
    setIsSaving(true);
    setPendingPermissionId(permissionId);

    try {
      await rolesService.syncRolePermissions(
        roleId,
        Array.from(nextPermissionIds),
      );
      await Promise.all([mutate(roleKey), mutate(API_ROUTES.roles.base)]);
      toast.success("Đã cập nhật quyền của vai trò.");
    } catch {
      setChangedPermissionIds(new Set(assignedPermissionIds));
      toast.error("Không thể cập nhật quyền. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
      setPendingPermissionId(null);
    }
  };

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          Quyền của vai trò
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tích chọn để thêm hoặc bớt quyền khỏi vai trò.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[minmax(240px,1fr)_minmax(260px,1fr)_120px] border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
            <span>Quyền</span>
            <span>Mô tả</span>
            <span className="text-center">Trạng thái</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Đang tải quyền...
            </div>
          ) : sortedPermissions.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">
              Chưa có quyền nào.
            </p>
          ) : (
            sortedPermissions.map((permission) => {
              const isAssigned = assignedPermissionIds.has(permission.id);
              const isPending = pendingPermissionId === permission.id;

              return (
                <label
                  key={permission.id}
                  className="grid cursor-pointer grid-cols-[minmax(240px,1fr)_minmax(260px,1fr)_120px] items-center border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                >
                  <span className="font-mono text-sm font-medium text-slate-900">
                    {permission.name}
                  </span>
                  <span className="pr-4 text-sm text-slate-500">
                    {permission.description || "Chưa có mô tả"}
                  </span>
                  <span className="flex justify-center">
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        disabled={isSaving}
                        onChange={() => togglePermission(permission.id)}
                        aria-label={`Gán quyền ${permission.name}`}
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
