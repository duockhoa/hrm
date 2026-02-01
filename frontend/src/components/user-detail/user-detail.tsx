import OpenFormButton from "../open-form-button/open-form-button";
import FieldDisplay from "../field-display/field-display";
import { AiFillDelete } from "react-icons/ai";
import { FaRegPaperPlane } from "react-icons/fa";
import { FaPaperPlane } from "react-icons/fa";
import AddContactForm from "../form-add-contract/form-add-contact";

export default function UserDetail({ user }: { user: any }) {
  if (!user) {
    return <div>Loading user details...</div>;
  }

  const handleOpenForm = () => {
    console.log("Open Add Contact Form");
  };

  return (
    <div className="w-full max-w-4xl bg-white  border p-4  rounded flex flex-col gap-4 text-center shadow-md">
      <h1 className="text-4xl font-bold text-blue-500">
        {user?.name} - {user?.position} - {user?.department}
      </h1>
      <div>
        <div className="">
          <OpenFormButton
            name="Thêm hợp đồng"
            icon={<AiFillDelete />}
            form={<AddContactForm user_id={user?.id} />}
          />
          <OpenFormButton name="Thêm hợp đồng" icon={<FaRegPaperPlane />} />
          <OpenFormButton name="Thêm hợp đồng" icon={<FaPaperPlane />} />
        </div>
      </div>
      <div className="gap-4">
        <FieldDisplay lable="Mã nhân viên" value={user?.username} />
        <FieldDisplay lable="Họ và tên" value={user?.department} />
        <FieldDisplay lable="Chức vụ" value={user?.position} />
        <FieldDisplay lable="Email" value={user?.email} />
        <FieldDisplay lable="Số điện thoại" value={user?.phone} />
        <FieldDisplay lable="Ngày sinh" value={user?.dateOfBirth} />
        <FieldDisplay lable="Ngày bắt đầu làm việc" value={user?.startDate} />
      </div>
    </div>
  );
}
