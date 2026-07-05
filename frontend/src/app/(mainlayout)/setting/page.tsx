"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import {
  ListChecks,
  Loader2,
  PlusIcon,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  permissionsService,
  rolesService,
  usersService,
} from "@/services/index.service";
import useUsersStore from "@/store/users.store";

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

type UserRole = {
  roles?: Role;
};

type SettingTab = "roles" | "permissions" | "users";

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
    id: "users",
    title: "Phân quyền người dùng",
    description: "Gán vai trò cho từng nhân sự.",
    icon: UserRoundCog,
  },
];

const getRolePermissionIds = (role?: Role) =>
  new Set(
    role?.rolePermissions
      ?.map((rolePermission) => rolePermission.permissions?.id)
      .filter((id): id is number => typeof id === "number") ?? [],
  );

const getUserRoleIds = (userRoles?: UserRole[]) =>
  userRoles
    ?.map((userRole) => userRole.roles?.id)
    .filter((id): id is number => typeof id === "number") ?? [];

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
  const { users } = useUsersStore();
  const [activeTab, setActiveTab] = useState<SettingTab>("roles");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    [],
  );
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<number[]>([]);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [isSavingRolePermissions, setIsSavingRolePermissions] =
    useState(false);
  const [isSavingUserRoles, setIsSavingUserRoles] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useSWR<Role[]>(
    API_ROUTES.roles.base,
    rolesService.fetcherRoles,
  );
  const { data: permissions = [], isLoading: permissionsLoading } = useSWR<
    Permission[]
  >(API_ROUTES.permissions.base, permissionsService.fetcherPermissions);
  const { data: userRoles = [], isLoading: userRolesLoading } = useSWR<
    UserRole[]
  >(
    selectedUserId
      ? `${API_ROUTES.users.base}/${selectedUserId}/roles`
      : null,
    () => usersService.fetcherUserRoles(Number(selectedUserId)),
  );

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  const selectedUser = useMemo(
    () => users.find((user) => Number(user.id) === selectedUserId),
    [selectedUserId, users],
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

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesKeyword(
          [user.id, user.name, user.username, user.department, user.position],
          userSearch,
        ),
      ),
    [userSearch, users],
  );

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    setSelectedPermissionIds(Array.from(getRolePermissionIds(selectedRole)));
  }, [selectedRole]);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(Number(users[0].id));
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    setSelectedUserRoleIds(getUserRoleIds(userRoles));
  }, [userRoles]);

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

  const toggleUserRole = (roleId: number) => {
    setSelectedUserRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  };

  const handleCreateRole = async (data: {
    name: string;
    description: string;
  }) => {
    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên vai trò.");
      return;
    }

    try {
      const role = await rolesService.createRole({
        name,
        description: data.description.trim(),
      });
      setSelectedRoleId(role.id);
      await mutate(API_ROUTES.roles.base);
      toast.success("Đã tạo vai trò.");
    } catch {
      toast.error("Không thể tạo vai trò.");
    }
  };

  const handleCreatePermission = async (data: {
    name: string;
    description: string;
  }) => {
    const name = data.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập mã quyền.");
      return;
    }

    try {
      await permissionsService.createPermission({
        name,
        description: data.description.trim(),
      });
      await mutate(API_ROUTES.permissions.base);
      toast.success("Đã tạo quyền.");
    } catch {
      toast.error("Không thể tạo quyền.");
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

  const handleSaveUserRoles = async () => {
    if (!selectedUserId) {
      return;
    }

    setIsSavingUserRoles(true);
    try {
      await usersService.syncUserRoles(selectedUserId, selectedUserRoleIds);
      await mutate(`${API_ROUTES.users.base}/${selectedUserId}/roles`);
      toast.success("Đã cập nhật vai trò cho nhân sự.");
    } catch {
      toast.error("Không thể cập nhật vai trò cho nhân sự.");
    } finally {
      setIsSavingUserRoles(false);
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
                        <button
                          type="button"
                          className="inline-flex text-red-500 hover:text-red-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteRole(role.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                    <button
                      type="button"
                      className="inline-flex text-red-500 hover:text-red-700"
                      onClick={() => handleDeletePermission(permission.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Phân quyền người dùng
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Chọn nhân sự ở danh sách bên trái và gán vai trò ở bên phải.
          </p>
        </div>
        <Button
          onClick={handleSaveUserRoles}
          disabled={!selectedUserId || isSavingUserRoles}
        >
          {isSavingUserRoles ? <Loader2 className="animate-spin" /> : <Save />}
          Lưu phân quyền
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-h-0 flex-col border-r border-gray-200">
          <div className="relative border-b border-gray-200 p-4">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Tìm theo tên, mã nhân sự, phòng ban hoặc chức vụ"
              className="pl-9"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Nhân sự</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Chức vụ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-gray-500">
                      Chưa có nhân sự phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      onClick={() => setSelectedUserId(Number(user.id))}
                      className={`cursor-pointer ${
                        Number(user.id) === selectedUserId ? "bg-blue-50" : ""
                      }`}
                    >
                      <TableCell className="text-gray-500">{user.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {user.name || user.username || `User #${user.id}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email || user.username || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {user.department || "-"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {user.position || "-"}
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
            <h3 className="truncate text-base font-semibold text-gray-900">
              {selectedUser?.name || "Chưa chọn nhân sự"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedUserRoleIds.length} vai trò đang được gán.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {userRolesLoading ? (
              <p className="text-sm text-gray-500">
                Đang tải vai trò của nhân sự...
              </p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500">
                Chưa có vai trò nào để gán.
              </p>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => {
                  const checked = selectedUserRoleIds.includes(role.id);

                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                        checked
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUserRole(role.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          {role.name}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {role.description || "Không có mô tả"}
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white shadow-md">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý vai trò, quyền truy cập và phân quyền người dùng.
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
          {activeTab === "users" && renderUsersTab()}
        </main>
      </div>
    </div>
  );
}
