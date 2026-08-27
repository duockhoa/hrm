import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Application } from "@/types/application";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

export default function ApplicationDetail({
  application,
}: {
  application?: Application;
}) {
  if (!application) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <Skeleton className="mx-auto h-10 w-3/4" />
        <div className="my-4 border-t border-gray-300" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="flex w-full max-w-4xl flex-col gap-4 rounded border bg-white p-4 text-center shadow-md">
      <h1 className="text-3xl font-bold text-blue-500 md:text-4xl">
        {application.name} - {application.key}
      </h1>
      <div className="border-t border-gray-300" />
      <div className="space-y-2">
        <DetailRow label="ID">{application.id}</DetailRow>
        <DetailRow label="Key ứng dụng">{application.key}</DetailRow>
        <DetailRow label="Tên ứng dụng">{application.name}</DetailRow>
        <DetailRow label="Mô tả">
          {application.description || "Chưa có mô tả"}
        </DetailRow>
        <DetailRow label="Thứ tự hiển thị">
          {application.default_order}
        </DetailRow>
        <DetailRow label="Trạng thái">
          <Badge variant={application.is_active ? "default" : "secondary"}>
            {application.is_active ? "Hoạt động" : "Tạm khóa"}
          </Badge>
        </DetailRow>
      </div>
    </section>
  );
}
