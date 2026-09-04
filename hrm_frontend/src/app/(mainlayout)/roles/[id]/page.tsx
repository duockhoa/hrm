"use client";

import RoleDetail from "@/components/roles/detail-role";
import RoleDetailHeader from "@/components/roles/header-role-detail";
import RolePermissionsInline from "@/components/roles/inline-role-permissions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { rolesService } from "@/services/index.service";
import type { Role } from "@/types/role";
import { useParams } from "next/navigation";
import useSWR from "swr";
import RolesPage from "../page";

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const roleId = Number(params.id);
  const isMobile = useMobile();
  const roleKey = `${API_ROUTES.roles.base}/${roleId}`;
  const { data: role, error } = useSWR<Role>(
    Number.isInteger(roleId) ? roleKey : null,
    () => rolesService.fetcherRoleById(roleId),
  );

  if (error) {
    return (
      <div className="h-full rounded-lg bg-white p-4 shadow-md">
        Không thể tải thông tin vai trò.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={30}
            minSize={30}
            className="min-h-0 min-w-100 overflow-hidden"
          >
            <RolesPage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel
          defaultSize={isMobile ? 100 : 70}
          className="overflow-auto p-4"
        >
          <RoleDetailHeader role={role} />
          <div className="mt-4 flex flex-col items-center gap-4 rounded">
            <RoleDetail role={role} />
            {role?.id && <RolePermissionsInline roleId={role.id} />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
