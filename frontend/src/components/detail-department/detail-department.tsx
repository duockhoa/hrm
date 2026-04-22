import FieldDisplay from "../field-display/field-display";
export default function DetailDepartment({ department }: { department: any }) {
  if (!department) {
    return <div>Loading department details...</div>;
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
