import FieldDisplay from "@/components/common/field-display";
import { Skeleton } from "../ui/skeleton";

function DetailDepartmentSkeleton() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4 rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="mx-auto h-10 w-3/4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DetailDepartment({ department }: { department: any }) {
  if (!department) {
    return <DetailDepartmentSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl bg-white  border p-4  rounded flex flex-col gap-4 text-center shadow-md">
      <h1 className="text-4xl font-bold text-blue-500">
        {department?.name} - {department?.description} -
        {department?.company?.name}
      </h1>
      <div>
        <div className="">
          {
            // khu vực cho nút thêm hợp đồng hoặc các hành động khác liên quan đến
          }
        </div>
      </div>
      <div className="gap-4">
        <FieldDisplay lable="Mã bộ phận" value={department?.name} />
        <FieldDisplay lable="Tên bộ phận" value={department?.description} />
        <FieldDisplay lable="Công ty" value={department?.company?.name} />
        <FieldDisplay
          lable="Trưởng bộ phận"
          value={department?.team_lead_user?.name}
        />
        <FieldDisplay
          lable="Số lượng thành viên"
          value={department?.users.length}
        />
      </div>
    </div>
  );
}
