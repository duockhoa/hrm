export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-blue-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-md border border-gray-200 bg-white p-6 shadow-md md:p-8">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-sm font-medium text-blue-600">DK HRM</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            Chính sách bảo mật
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Cập nhật lần cuối: 26/04/2026
          </p>
        </div>

        <div className="mt-6 space-y-6 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              1. Mục đích thu thập dữ liệu
            </h2>
            <p className="mt-2">
              Hệ thống DK HRM thu thập và xử lý thông tin nhân sự nhằm phục vụ
              các hoạt động quản lý nội bộ như quản lý hồ sơ nhân viên, phòng
              ban, công ty, hợp đồng, chấm công, ngày phép và các nghiệp vụ nhân
              sự liên quan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              2. Loại thông tin được xử lý
            </h2>
            <p className="mt-2">
              Thông tin có thể bao gồm họ tên, tài khoản đăng nhập, email, số
              điện thoại, ngày sinh, chức vụ, phòng ban, công ty, trạng thái làm
              việc, dữ liệu hợp đồng và các thông tin khác do người dùng được
              phân quyền nhập vào hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              3. Phạm vi sử dụng thông tin
            </h2>
            <p className="mt-2">
              Dữ liệu chỉ được sử dụng cho mục đích vận hành và quản trị nội bộ.
              Người dùng không được sao chép, chia sẻ, xuất dữ liệu hoặc sử dụng
              thông tin nhân sự ngoài phạm vi công việc được giao nếu chưa có sự
              cho phép hợp lệ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              4. Bảo vệ tài khoản
            </h2>
            <p className="mt-2">
              Người dùng có trách nhiệm bảo mật thông tin đăng nhập, không chia
              sẻ mật khẩu, token hoặc thiết bị đã đăng nhập cho người khác. Khi
              phát hiện truy cập bất thường, người dùng cần đổi mật khẩu và
              thông báo cho bộ phận quản trị hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              5. Lưu trữ và bảo mật dữ liệu
            </h2>
            <p className="mt-2">
              Dữ liệu được lưu trữ trên hệ thống phục vụ hoạt động quản lý nhân
              sự. Các biện pháp kỹ thuật như phân quyền truy cập, xác thực người
              dùng và bảo vệ phiên đăng nhập được áp dụng để hạn chế truy cập
              trái phép.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              6. Thay đổi chính sách
            </h2>
            <p className="mt-2">
              Chính sách này có thể được cập nhật để phù hợp với thay đổi trong
              quy trình vận hành hoặc yêu cầu quản trị. Phiên bản mới sẽ có hiệu
              lực khi được công bố trên hệ thống.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
