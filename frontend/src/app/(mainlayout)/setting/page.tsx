"use client";

import AddPermissionForm from "@/components/permissions/form-add-permission";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import { permissionsService } from "@/services/index.service";
import { Pencil, PlusIcon, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

type Permission = {
  id: number;
  name: string;
  description?: string | null;
  rolePermissions?: Array<unknown>;
};

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
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const { data: permissions = [], isLoading } = useSWR<Permission[]>(
    API_ROUTES.permissions.base,
    permissionsService.fetcherPermissions,
  );
  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) =>
        matchesKeyword(
          [permission.id, permission.name, permission.description],
          search,
        ),
      ),
    [permissions, search],
  );

  const handleCreate = async (data: { name: string; description: string }) => {
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

  const handleUpdate = async (data: { name: string; description: string }) => {
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
      await mutate(API_ROUTES.permissions.base);
      toast.success("Đã cập nhật quyền.");
      return true;
    } catch {
      toast.error("Không thể cập nhật quyền.");
      return false;
    }
  };

  const handleDelete = async (permission: Permission) => {
    if (!window.confirm(`Xóa quyền ${permission.name}?`)) {
      return;
    }

    try {
      await permissionsService.deletePermission(permission.id);
      await mutate(API_ROUTES.permissions.base);
      toast.success("Đã xóa quyền.");
    } catch {
      toast.error("Không thể xóa quyền.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white shadow-md">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý danh sách quyền truy cập của hệ thống.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 xl:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo ID, key quyền hoặc mô tả"
            className="pl-9"
          />
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
              onSubmit={handleCreate}
              onClose={() => setIsAddOpen(false)}
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
                onSubmit={handleUpdate}
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
            {isLoading ? (
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
                        onClick={() => handleDelete(permission)}
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
}
