import OpenFormButton from "../button-open-form/button-open-form";
import FieldDisplay from "../field-display/field-display";
import { AiFillDelete } from "react-icons/ai";
import { FaRegPaperPlane } from "react-icons/fa";
import { FaPaperPlane } from "react-icons/fa";
import { FaFileContract } from "react-icons/fa";
import AddContactForm from "../form-add-contract/form-add-contact";
import { Skeleton } from "../ui/skeleton";

function UserDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="mx-auto h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="flex justify-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserDetail({ user }: { user: any }) {
  if (!user) {
    return <UserDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl bg-white  border p-4  rounded flex flex-col gap-4 text-center shadow-md">
      <h1 className="text-4xl font-bold text-blue-500">
        {user?.name} - {user?.position} - {user?.department}
      </h1>
      <div className="border-t-1 border-gray-300 p-y-2"></div>
      <div>
        <div className="">
          <OpenFormButton
            name="Thêm hợp đồng"
            icon={<FaFileContract />}
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
