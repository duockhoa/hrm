"use client";
import useUserStore from "@/store/user.store";
import UpdateAvatar from "@/components/update-avatar/aupdate-avatar";
import FieldDisplay from "@/components/field-display/field-display";
import ChangePassword from "@/components/change-password/change-password";

export default function Profile() {
  const { user } = useUserStore();
  return (
    <div className="w-full lg:h-full bg-white rounded-2xl shadow-md">
      <div className=" grid p-2 grid-cols-1 lg:grid-cols-[1fr_2fr] lg:p-4 gap-4 h-full">
        <div className="shadow-lg border border-gray-200 p-4 rounded-lg h-full flex flex-col items-center">
          <UpdateAvatar />
          <div className="text-gray-700 mt-4 text-xl font-semibold">
            {user?.name || "No name available"}
          </div>
          <div className=" text-gray-400  text-md">
            {user?.email || "No email available"}
          </div>

          <div className="border border-gray-200 w-full my-2"></div>
        </div>
        <div className="flex flex-col gap-4 h-full  p-2 ">
          <div className="border border-gray-200 shadow-md p-4 rounded-lg h-full ">
            <h2 className="text-lg font-semibold mb-4"> Thông tin cá nhân:</h2>
            <div className="w-full border border-t-gray-200 my-2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ">
              <div className="flex flex-col gap-2">
                <FieldDisplay
                  lable="Tên nhân sự:"
                  value={user?.name || "No name available"}
                />
                <FieldDisplay
                  lable="Mã nhân viên:"
                  value={user?.username || "No username available"}
                />
                <FieldDisplay
                  lable="Bộ phận:"
                  value={user?.department || "No department available"}
                />
                <FieldDisplay
                  lable="Chức vụ:"
                  value={user?.position || "No position available"}
                />
                <FieldDisplay
                  lable="Trạng thái:"
                  value={user?.status || "Chính thức"}
                />
                <FieldDisplay
                  lable="Ngày làm CT:"
                  value={user?.startDate || "No start date available"}
                />
                <FieldDisplay
                  lable="Ngày BĐ thử việc:"
                  value={
                    user?.startProbationDate ||
                    "No start probation date available"
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldDisplay
                  lable="Email:"
                  value={user?.email || "No email available"}
                />
                <FieldDisplay
                  lable="SĐT:"
                  value={user?.phone || "No phone available"}
                />
                <FieldDisplay
                  lable="Giới tính:"
                  value={user?.gender || "No gender available"}
                />
                <FieldDisplay
                  lable="Ngày sinh:"
                  value={user?.dateOfBirth || "No date of birth available"}
                />
                <FieldDisplay
                  lable="Địa chỉ:"
                  value={user?.address || "No address available"}
                />
                <FieldDisplay
                  lable="Số CMND/CCCD:"
                  value={user?.identityNumber || "No identity number available"}
                />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 shadow-md p-4 rounded-lg h-full ">
            <h2 className="text-lg font-semibold mb-4"> Thay đổi mật khẩu:</h2>
            <div className="w-full border border-t-gray-200 my-2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ">
              <div>
                <ChangePassword />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-md text-gray-400 mb-2">
                  Mật khẩu tài khoản của bạn phải đáp ứng các yêu cầu sau:
                </h3>
                <ul className="list-disc list-inside text-gray-700 pl-4">
                  <li>Ít nhất 8 ký tự</li>
                  <li>Chứa ít nhất một chữ hoa (A-Z)</li>
                  <li>Chứa ít nhất một chữ thường (a-z)</li>
                  <li>Chứa ít nhất một số (0-9)</li>
                  <li>Chứa ít nhất một ký tự đặc biệt (!@#$%^&*)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
