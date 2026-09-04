import FormForgotPassword from "@/components/form-forgot-password/form-forgot-password";
import Image from "next/image";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="mb-6 flex w-full max-w-md flex-col items-center gap-3 text-center">
        <Image
          src="/dkpharmalogo.png"
          alt="DK Pharma"
          width={175}
          height={75}
          priority
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sử dụng OTP gửi qua email để bảo vệ tài khoản.
          </p>
        </div>
      </div>
      <FormForgotPassword />
    </div>
  );
}
