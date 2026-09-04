import LoginForm from "@/components/form-login/form-login";
import Image from "next/image";
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md flex flex-col p-6 bg-white rounded-lg shadow-lg">
        <Image
          src={"/dkpharmalogo.png"}
          alt="Logo"
          width={175}
          height={75}
          className="m-auto p-4"
        />
        <h1 className="text-2xl font-bold mb-4 text-center">
          Đăng Nhập Vào DKPharma
        </h1>
        <LoginForm />
        <div>
          <h3 className="text-center p-4 pb-0">
            Bạn chưa có tài khoản?
            <a href="/register" className="text-blue-500 px-2">
              Đăng ký
            </a>
          </h3>
        </div>
        <div className="text-center">
          <a href="/forgot-password" className="text-blue-500 hover:underline ">
            Lấy lại mật khẩu
          </a>
        </div>
        <div className="text-center text-sm text-gray-500 mt-4">
          Đăng nhập đồng nghĩa với đã đồng ý
          <a href="/terms" className="text-blue-500 hover:underline px-2 ">
            Điều khoản và chính sách
          </a>
          của chúng tôi
        </div>
      </div>
    </div>
  );
}
