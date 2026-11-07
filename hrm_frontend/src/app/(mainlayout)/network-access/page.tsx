"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, MoreHorizontal, Network } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import Link from "next/link";
import {
  networkPoliciesService,
  NetworkRange,
} from "@/services/network-policies.service";
import { usersService } from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";

export default function NetworkAccessPage() {
  const {
    data: permissions,
    error: permissionError,
    isLoading: permissionsLoading,
  } = useSWR(
    `${API_ROUTES.users.me}/permissions`,
    usersService.fetcherMyPermissionKeys,
  );
  const canEdit = permissions?.permissionKeys.includes("users.update");
  const {
    data: ranges,
    error,
    isLoading,
    mutate,
  } = useSWR(
    canEdit ? "/network-policies/ranges" : null,
    networkPoliciesService.ranges,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const [name, setName] = useState("");
  const [cidr, setCidr] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number>();
  const reset = () => {
    setEditingId(undefined);
    setName("");
    setCidr("");
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await networkPoliciesService.saveRange({ name, cidr }, editingId);
      reset();
      setFormOpen(false);
      toast.success("Đã lưu IP được phép.");
      await mutate();
    } catch (error: unknown) {
      const message = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Không thể lưu IP.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: number) {
    setBusy(true);
    try {
      await networkPoliciesService.deleteRange(id);
      if (editingId === id) reset();
      setDeleteId(undefined);
      toast.success("Đã xóa IP.");
      await mutate();
    } catch {
      toast.error("Không thể xóa IP.");
    } finally {
      setBusy(false);
    }
  }
  function edit(range: NetworkRange) {
    setEditingId(range.id);
    setName(range.name);
    setCidr(range.cidr);
    setFormOpen(true);
  }

  const showSkeleton = permissionsLoading || isLoading;
  if (permissionError)
    return (
      <p role="alert" className="p-4">
        Không tải được quyền truy cập.
      </p>
    );
  if (!permissionsLoading && !canEdit)
    return <p className="p-4">Bạn không có quyền quản lý IP truy cập.</p>;

  return (
    <div className="flex flex-col bg-white h-[100%] rounded-lg shadow-md overflow-auto" aria-busy={showSkeleton}>
      <div className="w-full sticky top-0 z-10 bg-white p-2">
        <div className="w-full flex justify-between border-b border-gray-200 pb-2 bg-white">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href="/network-access">IP truy cập</Link>
          </div>
          <Button
            className="cursor-pointer"
            disabled={busy || showSkeleton}
            onClick={() => {
              reset();
              setFormOpen(true);
            }}
          >
            <PlusIcon />
            Thêm mới
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col p-2 pt-0 gap-2">
        {error ? (
          <div role="alert" className="p-4">
            Không tải được danh sách IP.{" "}
            <Button variant="outline" onClick={() => mutate()}>
              Thử lại
            </Button>
          </div>
        ) : showSkeleton ? (
          <ListSkeleton label="Đang tải IP truy cập..." roundIcon />
        ) : ranges?.length ? (
          ranges.map((range) => (
            <div
              key={range.id}
              className="flex items-center gap-4 rounded-md border border-transparent border-b-gray-200 p-2 transition-colors hover:bg-gray-50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Network className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold break-words">{range.name}</p>
                <p className="font-mono text-sm break-all text-gray-600">
                  {range.cidr}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Thao tác với ${range.name}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => edit(range)}>
                    Sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteId(range.id)}>
                    Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            Chưa có IP được phép.
          </p>
        )}
      </div>
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!busy) setFormOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-lg font-semibold mb-4 text-center">
            {editingId === undefined ? "THÊM IP TRUY CẬP" : "SỬA IP TRUY CẬP"}
          </DialogTitle>
          <form onSubmit={save} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm">Tên mạng</span>
              <Input
                required
                maxLength={100}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhà máy A"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm">IP hoặc dải mạng CIDR (IPv4/IPv6)</span>
              <Input
                required
                maxLength={50}
                value={cidr}
                disabled={busy}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="203.0.113.10 hoặc 2001:db8::/48"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setFormOpen(false)}
              >
                Hủy
              </Button>
              <Button disabled={busy} type="submit">
                {busy ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteId !== undefined}
        onOpenChange={(open) => {
          if (!busy && !open) setDeleteId(undefined);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogTitle>Xóa IP truy cập?</DialogTitle>
          <p className="break-all text-sm text-gray-600">
            {ranges?.find((range) => range.id === deleteId)?.cidr}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteId(undefined)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => deleteId !== undefined && remove(deleteId)}
            >
              {busy ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
