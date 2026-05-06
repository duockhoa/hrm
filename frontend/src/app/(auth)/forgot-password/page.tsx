import FormForgotPassword from "@/components/form-forgot-password/form-forgot-password";
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-between flex-col bg-gray-50">
      <div className="flex flex-row p-4 items-center gap-4 justify-between w-full max-w-2xl">
        <div className="flex items-center gap-4">
          <img src={"/dkpharmalogo.png"} alt="Logo" className="w-50" />
          <h1 className="text-2xl">Đặt lại mật khẩu</h1>
        </div>
        <p className="text-sm text-gray-500">
          <a href="/support" className="text-blue-500 hover:underline">
            Bạn cần hỗ trợ?
          </a>
        </p>
      </div>
      <FormForgotPassword />
      <div className="w-full h-16 flex items-center justify-center p-4 text-sm text-gray-500">
        phần chân trang
      </div>
    </div>
  );
}
