import PolicyBackButton from "../policy-back-button";

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-gray-200 pb-5">
          <p className="text-sm font-medium text-blue-600">DK Pharma</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            Chính sách bảo mật
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Cập nhật lần cuối: 26/04/2026
          </p>
        </div>

        <div className="mt-8 space-y-8 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              1. Mục đích thu thập dữ liệu
            </h2>
            <p className="mt-2">
              Hệ thống Hồ sơ lô thu thập và xử lý dữ liệu nhằm phục vụ việc
              quản lý lệnh sản xuất, bán thành phẩm, thành phẩm, nguyên liệu,
              phiếu kiểm tra trong quá trình sản xuất và các nghiệp vụ nội bộ
              liên quan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              2. Loại thông tin được xử lý
            </h2>
            <p className="mt-2">
              Thông tin có thể bao gồm tài khoản đăng nhập, thông tin người
              dùng, mã sản phẩm, lô sản xuất, dữ liệu kiểm tra chất lượng, hình
              ảnh đính kèm, thời điểm thao tác và các dữ liệu do người dùng
              được phân quyền nhập vào hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              3. Phạm vi sử dụng thông tin
            </h2>
            <p className="mt-2">
              Dữ liệu chỉ được sử dụng cho mục đích vận hành, theo dõi và quản
              trị nội bộ. Người dùng không được sao chép, chia sẻ, xuất dữ liệu
              hoặc sử dụng thông tin ngoài phạm vi công việc được giao nếu chưa
              có sự cho phép hợp lệ.
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
              Dữ liệu được lưu trữ trên hệ thống phục vụ hoạt động quản lý sản
              xuất. Các biện pháp kỹ thuật như phân quyền truy cập, xác thực
              người dùng và bảo vệ phiên đăng nhập được áp dụng để hạn chế truy
              cập trái phép.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              6. Thay đổi chính sách
            </h2>
            <p className="mt-2">
              Chính sách này có thể được cập nhật để phù hợp với thay đổi trong
              quy trình vận hành hoặc yêu cầu quản trị. Phiên bản mới sẽ có
              hiệu lực khi được công bố trên hệ thống.
            </p>
          </section>
        </div>

        <PolicyBackButton className="mt-8" />
      </div>
    </main>
  );
}
