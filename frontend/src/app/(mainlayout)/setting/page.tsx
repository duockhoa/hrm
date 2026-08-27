"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import {
  AppWindow,
  ListChecks,
  Loader2,
  Pencil,
  PlusIcon,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddApplicationForm from "@/components/form-add-application/form-add-application";
import AddPermissionForm from "@/components/form-add-permission/form-add-permission";
import AddRoleForm from "@/components/form-add-role/form-add-role";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import {
  applicationsService,
  permissionsService,
  rolesService,
} from "@/services/index.service";

type Permission = {
  id: number;
  name: string;
  description?: string | null;
  rolePermissions?: Array<{ roles?: Role }>;
};

type Role = {
  id: number;
  name: string;
  description?: string | null;
  rolePermissions?: Array<{ permissions?: Permission }>;
};

type Application = {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  default_order: number;
  is_active: boolean;
};

type SettingTab = "roles" | "permissions" | "applications";

const tabs: Array<{
  id: SettingTab;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    id: "roles",
    title: "Vai trò",
    description: "Quản lý nhóm quyền và quyền của từng vai trò.",
    icon: ShieldCheck,
  },
  {
    id: "permissions",
    title: "Danh sách quyền",
    description: "Quản lý các mã quyền chuẩn dùng trong hệ thống.",
    icon: ListChecks,
  },
  {
    id: "applications",
    title: "Ứng dụng",
    description: "Tạo ứng dụng và bật tắt trạng thái truy cập.",
    icon: AppWindow,
  },
];

const getRolePermissionIds = (role?: Role) =>
  new Set(
    role?.rolePermissions
      ?.map((rolePermission) => rolePermission.permissions?.id)
      .filter((id): id is number => typeof id === "number") ?? [],
  );

const matchesKeyword = (values: Array<unknown>, keyword: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedKeyword),
  );
};

export default function SettingPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>("roles");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    [],
  );
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [isAddApplicationOpen, setIsAddApplicationOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);
  const [isSavingRolePermissions, setIsSavingRolePermissions] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useSWR<Role[]>(
    API_ROUTES.roles.base,
    rolesService.fetcherRoles,
  );
  const { data: permissions = [], isLoading: permissionsLoading } = useSWR<
    Permission[]
  >(API_ROUTES.permissions.base, permissionsService.fetcherPermissions);
  const { data: applications = [], isLoading: applicationsLoading } = useSWR<
    Application[]
  >(API_ROUTES.applications.base, () =>
    applicationsService.fetcherApplications(true),
  );
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) =>
        matchesKeyword(
          [permission.id, permission.name, permission.description],
          permissionSearch,
        ),
      ),
    [permissionSearch, permissions],
  );

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) =>
        matchesKeyword(
          [
            application.id,
            application.key,
            application.name,
            application.description,
          ],
          applicationSearch,
        ),
      ),
    [applicationSearch, applications],
  );

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    setSelectedPermissionIds(Array.from(getRolePermissionIds(selectedRole)));
  }, [selectedRole]);

  const refreshAuthorizationData = async () => {
    await Promise.all([
      mutate(API_ROUTES.roles.base),
      mutate(API_ROUTES.permissions.base),
    ]);
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
  };

  const handleCreateRole = async (data: {
    name: string;
    description: string;
  }) => {
    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên vai trò.");
      return false;
    }

    try {
      const role = await rolesService.createRole({
        name,
        description: data.description.trim(),
      });
      setSelectedRoleId(role.id);
      await mutate(API_ROUTES.roles.base);
      toast.success("Đã tạo vai trò.");
      return true;
    } catch {
      toast.error("Không thể tạo vai trò.");
      return false;
    }
  };

  const handleCreatePermission = async (data: {
    name: string;
    description: string;
  }) => {
    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập mã quyền.");
      return false;
    }

    try {
      await permissionsService.createPermission({
        name,
        description: data.description.trim(),
      });
      await mutate(API_ROUTES.permissions.base);
      toast.success("Đã tạo quyền.");
      return true;
    } catch {
      toast.error("Không thể tạo quyền.");
      return false;
    }
  };

  const handleUpdateRole = async (data: {
    name: string;
    description: string;
  }) => {
    if (!editingRole) {
      return false;
    }

    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên vai trò.");
      return false;
    }

    try {
      await rolesService.updateRole(editingRole.id, {
        name,
        description: data.description.trim(),
      });
      await mutate(API_ROUTES.roles.base);
      toast.success("Đã cập nhật vai trò.");
      return true;
    } catch {
      toast.error("Không thể cập nhật vai trò.");
      return false;
    }
  };

  const handleUpdatePermission = async (data: {
    name: string;
    description: string;
  }) => {
    if (!editingPermission) {
      return false;
    }

    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập mã quyền.");
      return false;
    }

    try {
      await permissionsService.updatePermission(editingPermission.id, {
        name,
        description: data.description.trim(),
      });
      await refreshAuthorizationData();
      toast.success("Đã cập nhật quyền.");
      return true;
    } catch {
      toast.error("Không thể cập nhật quyền.");
      return false;
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm("Xóa vai trò này?")) {
      return;
    }

    try {
      await rolesService.deleteRole(roleId);
      if (selectedRoleId === roleId) {
        setSelectedRoleId(null);
      }
      await mutate(API_ROUTES.roles.base);
      toast.success("Đã xóa vai trò.");
    } catch {
      toast.error("Không thể xóa vai trò.");
    }
  };

  const handleDeletePermission = async (permissionId: number) => {
    if (!window.confirm("Xóa quyền này?")) {
      return;
    }

    try {
      await permissionsService.deletePermission(permissionId);
      await refreshAuthorizationData();
      toast.success("Đã xóa quyền.");
    } catch {
      toast.error("Không thể xóa quyền.");
    }
  };

  const handleCreateApplication = async (data: {
    key: string;
    name: string;
    description: string;
    default_order: string;
  }) => {
    const key = data.key.trim();
    const name = data.name.trim();
    const defaultOrder = Number(data.default_order || 0);

    if (!key || !name) {
      toast.error("Vui lòng nhập key và tên ứng dụng.");
      return false;
    }

    if (!Number.isInteger(defaultOrder)) {
      toast.error("Thứ tự phải là số nguyên.");
      return false;
    }

    try {
      await applicationsService.createApplication({
        key,
        name,
        description: data.description.trim(),
        default_order: defaultOrder,
        is_active: true,
      });
      await mutate(API_ROUTES.applications.base);
      toast.success("Đã tạo ứng dụng.");
      return true;
    } catch {
      toast.error("Không thể tạo ứng dụng.");
      return false;
    }
  };

  const handleToggleApplicationActive = async (application: Application) => {
    try {
      await applicationsService.updateApplication(application.id, {
        is_active: !application.is_active,
      });
      await mutate(API_ROUTES.applications.base);
      toast.success(
        application.is_active ? "Đã tắt ứng dụng." : "Đã bật ứng dụng.",
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái ứng dụng.");
    }
  };

  const handleUpdateApplication = async (data: {
    key: string;
    name: string;
    description: string;
    default_order: string;
  }) => {
    if (!editingApplication) {
      return false;
    }

    const key = data.key.trim();
    const name = data.name.trim();
    const defaultOrder = Number(data.default_order || 0);

    if (!key || !name) {
      toast.error("Vui lòng nhập key và tên ứng dụng.");
      return false;
    }

    if (!Number.isInteger(defaultOrder)) {
      toast.error("Thứ tự phải là số nguyên.");
      return false;
    }

    try {
      await applicationsService.updateApplication(editingApplication.id, {
        key,
        name,
        description: data.description.trim(),
        default_order: defaultOrder,
      });
      await mutate(API_ROUTES.applications.base);
      toast.success("Đã cập nhật ứng dụng.");
      return true;
    } catch {
      toast.error("Không thể cập nhật ứng dụng.");
      return false;
    }
  };

  const handleDeleteApplication = async (applicationId: number) => {
    if (!window.confirm("Xóa ứng dụng này?")) {
      return;
    }

    try {
      await applicationsService.deleteApplication(applicationId);
      await mutate(API_ROUTES.applications.base);
      toast.success("Đã xóa ứng dụng.");
    } catch {
      toast.error("Không thể xóa ứng dụng.");
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) {
      return;
    }

    setIsSavingRolePermissions(true);
    try {
      await rolesService.syncRolePermissions(
        selectedRoleId,
        selectedPermissionIds,
      );
      await refreshAuthorizationData();
      toast.success("Đã cập nhật quyền cho vai trò.");
    } catch {
      toast.error("Không thể cập nhật quyền cho vai trò.");
    } finally {
      setIsSavingRolePermissions(false);
    }
  };

  const renderRolesTab = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vai trò</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý danh sách vai trò và cấu hình quyền cho vai trò đang chọn.
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-h-0 flex-col border-r border-gray-200">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 2xl:flex-row 2xl:justify-end">
            <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
              <DialogTrigger asChild>
                <Button className="cursor-pointer">
                  <PlusIcon />
                  Thêm vai trò
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogTitle className="mb-4 text-center text-lg font-semibold">
                  THÊM VAI TRÒ MỚI
                </DialogTitle>
                <AddRoleForm
                  onSubmit={handleCreateRole}
                  onClose={() => setIsAddRoleOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Dialog
              open={Boolean(editingRole)}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingRole(null);
                }
              }}
            >
              <DialogContent className="max-w-lg">
                <DialogTitle className="mb-4 text-center text-lg font-semibold">
                  SỬA VAI TRÒ
                </DialogTitle>
                {editingRole && (
                  <AddRoleForm
                    key={editingRole.id}
                    initialData={editingRole}
                    submitLabel="Cập nhật"
                    onSubmit={handleUpdateRole}
                    onClose={() => setEditingRole(null)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Tên vai trò</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-28">Số quyền</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-gray-500">
                      Đang tải vai trò...
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-gray-500">
                      Chưa có vai trò nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`cursor-pointer ${
                        selectedRoleId === role.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <TableCell className="text-gray-500">{role.id}</TableCell>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-gray-600">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {role.rolePermissions?.length ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            title="Sửa vai trò"
                            aria-label={`Sửa vai trò ${role.name}`}
                            className="inline-flex text-blue-600 hover:text-blue-800"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingRole(role);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Xóa vai trò"
                            aria-label={`Xóa vai trò ${role.name}`}
                            className="inline-flex text-red-500 hover:text-red-700"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-gray-900">
                  Quyền của {selectedRole?.name || "vai trò"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedPermissionIds.length} quyền đang được chọn.
                </p>
              </div>
              <Button
                onClick={handleSaveRolePermissions}
                disabled={!selectedRoleId || isSavingRolePermissions}
              >
                {isSavingRolePermissions ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                Lưu
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {permissionsLoading ? (
              <p className="text-sm text-gray-500">Đang tải quyền...</p>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có quyền nào.</p>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => {
                  const checked = selectedPermissionIds.includes(permission.id);

                  return (
                    <label
                      key={permission.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                        checked
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium text-gray-900">
                          {permission.name}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {permission.description || "Không có mô tả"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPermissionsTab = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Danh sách quyền
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý key quyền dùng để cấu hình cho các vai trò.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 xl:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={permissionSearch}
            onChange={(event) => setPermissionSearch(event.target.value)}
            placeholder="Tìm theo ID, key quyền hoặc mô tả"
            className="pl-9"
          />
        </div>
        <Dialog
          open={isAddPermissionOpen}
          onOpenChange={setIsAddPermissionOpen}
        >
          <DialogTrigger asChild>
            <Button className="cursor-pointer">
              <PlusIcon />
              Thêm quyền
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogTitle className="mb-4 text-center text-lg font-semibold">
              THÊM QUYỀN MỚI
            </DialogTitle>
            <AddPermissionForm
              onSubmit={handleCreatePermission}
              onClose={() => setIsAddPermissionOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(editingPermission)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPermission(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogTitle className="mb-4 text-center text-lg font-semibold">
              SỬA QUYỀN
            </DialogTitle>
            {editingPermission && (
              <AddPermissionForm
                key={editingPermission.id}
                initialData={editingPermission}
                submitLabel="Cập nhật"
                onSubmit={handleUpdatePermission}
                onClose={() => setEditingPermission(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="w-40">Vai trò dùng</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-gray-500">
                  Đang tải quyền...
                </TableCell>
              </TableRow>
            ) : filteredPermissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-gray-500">
                  Chưa có quyền phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              filteredPermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="text-gray-500">
                    {permission.id}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {permission.name}
                  </TableCell>
                  <TableCell className="max-w-[520px] truncate text-gray-600">
                    {permission.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {permission.rolePermissions?.length ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        title="Sửa quyền"
                        aria-label={`Sửa quyền ${permission.name}`}
                        className="inline-flex text-blue-600 hover:text-blue-800"
                        onClick={() => setEditingPermission(permission)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa quyền"
                        aria-label={`Xóa quyền ${permission.name}`}
                        className="inline-flex text-red-500 hover:text-red-700"
                        onClick={() => handleDeletePermission(permission.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderApplicationsTab = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ứng dụng</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý danh sách ứng dụng để gán trực tiếp cho từng nhân sự.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 xl:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={applicationSearch}
            onChange={(event) => setApplicationSearch(event.target.value)}
            placeholder="Tìm theo ID, key, tên hoặc mô tả"
            className="pl-9"
          />
        </div>
        <Dialog
          open={isAddApplicationOpen}
          onOpenChange={setIsAddApplicationOpen}
        >
          <DialogTrigger asChild>
            <Button className="cursor-pointer">
              <PlusIcon />
              Thêm ứng dụng
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogTitle className="mb-4 text-center text-lg font-semibold">
              THÊM ỨNG DỤNG MỚI
            </DialogTitle>
            <AddApplicationForm
              onSubmit={handleCreateApplication}
              onClose={() => setIsAddApplicationOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(editingApplication)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingApplication(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogTitle className="mb-4 text-center text-lg font-semibold">
              SỬA ỨNG DỤNG
            </DialogTitle>
            {editingApplication && (
              <AddApplicationForm
                key={editingApplication.id}
                initialData={{
                  key: editingApplication.key,
                  name: editingApplication.name,
                  description: editingApplication.description ?? "",
                  default_order: String(editingApplication.default_order),
                }}
                submitLabel="Cập nhật"
                onSubmit={handleUpdateApplication}
                onClose={() => setEditingApplication(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Ứng dụng</TableHead>
              <TableHead className="w-28">Trạng thái</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicationsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-gray-500">
                  Đang tải ứng dụng...
                </TableCell>
              </TableRow>
            ) : filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-gray-500">
                  Chưa có ứng dụng phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="text-gray-500">
                    {application.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {application.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {application.key}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleApplicationActive(application)}
                    >
                      <Badge
                        variant={
                          application.is_active ? "default" : "secondary"
                        }
                      >
                        {application.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        title="Sửa ứng dụng"
                        aria-label={`Sửa ứng dụng ${application.name}`}
                        className="inline-flex text-blue-600 hover:text-blue-800"
                        onClick={() => setEditingApplication(application)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa ứng dụng"
                        aria-label={`Xóa ứng dụng ${application.name}`}
                        className="inline-flex text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteApplication(application.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white shadow-md">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý vai trò, quyền truy cập và ứng dụng.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-gray-200 bg-gray-50 p-3 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-1 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                    active
                      ? "border-blue-100 bg-white shadow-sm"
                      : "border-transparent hover:bg-white"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-5 w-5 ${
                      active ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      {tab.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-0 overflow-hidden">
          {activeTab === "roles" && renderRolesTab()}
          {activeTab === "permissions" && renderPermissionsTab()}
          {activeTab === "applications" && renderApplicationsTab()}
        </main>
      </div>
    </div>
  );
}
