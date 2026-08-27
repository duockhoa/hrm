import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Role } from "@/types/role";
import type { ReactNode } from "react";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full justify-start gap-4">
      <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
        {label}
      </div>
      <div className="flex-1 text-left text-gray-800 wrap-anywhere">
        {children}
      </div>
    </div>
  );
}

export default function RoleDetail({ role }: { role?: Role }) {
  if (!role) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <Skeleton className="mx-auto h-10 w-3/4" />
        <div className="my-4 border-t border-gray-300" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="flex w-full max-w-4xl flex-col gap-4 rounded border bg-white p-4 text-center shadow-md">
      <h1 className="text-3xl font-bold text-blue-500 md:text-4xl">
        {role.name}
      </h1>
      <div className="border-t border-gray-300" />
      <div className="space-y-2">
        <DetailRow label="ID">{role.id}</DetailRow>
        <DetailRow label="Tên vai trò">{role.name}</DetailRow>
        <DetailRow label="Mô tả">
          {role.description || "Chưa có mô tả"}
        </DetailRow>
        <DetailRow label="Số quyền">
          <Badge variant="secondary">
            {role.rolePermissions?.length ?? 0} quyền
          </Badge>
        </DetailRow>
      </div>
    </section>
  );
}
