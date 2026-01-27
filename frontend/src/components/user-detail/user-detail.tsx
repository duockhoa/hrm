import OpenFormButton from "../open-form-button/open-form-button";
import FieldDisplay from "../field-display/field-display";
import { AiFillDelete } from "react-icons/ai";
export default function UserDetail({ user }: { user: any }) {
  if (!user) {
    return <div>Loading user details...</div>;
  }

  return (
    <div className="w-full max-w-4xl bg-white  border p-4  rounded flex flex-col gap-4 text-center shadow-md">
      <h1 className="text-4xl font-bold text-blue-500">
        {user?.name} - {user?.position} - {user?.department}
      </h1>
      <div>
        <div className="">
          <OpenFormButton
            name="Thêm hợp đồng"
            onClick={() => {}}
            icon={<AiFillDelete />}
          />
          <OpenFormButton
            name="Thêm hợp đồng"
            onClick={() => {}}
            icon={<AiFillDelete />}
          />
          <OpenFormButton
            name="Thêm hợp đồng"
            onClick={() => {}}
            icon={<AiFillDelete />}
          />
        </div>
      </div>
      <div className="gap-4">
        <FieldDisplay lable="Email" value={user?.email} />
        <FieldDisplay lable="Số điện thoại" value={user?.phone} />
        <FieldDisplay lable="Địa chỉ" value={user?.address} />
        <FieldDisplay lable="Ngày sinh" value={user?.dateOfBirth} />
        <FieldDisplay lable="Ngày bắt đầu làm việc" value={user?.startDate} />
        <FieldDisplay lable="Mã nhân viên" value={user?.employeeId} />
      </div>
    </div>
  );
}
