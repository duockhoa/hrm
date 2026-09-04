import PolicyBackButton from "../policy-back-button";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-blue-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-md border border-gray-200 bg-white p-6 shadow-md md:p-8">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-sm font-medium text-blue-600">DK HRM</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            Điều khoản sử dụng
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Cập nhật lần cuối: 26/04/2026
          </p>
        </div>

        <div className="mt-6 space-y-6 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              1. Phạm vi áp dụng
            </h2>
            <p className="mt-2">
              Điều khoản này áp dụng cho toàn bộ người dùng truy cập và sử dụng
              hệ thống DK HRM, bao gồm nhân sự, quản lý, quản trị viên và các bộ
              phận được cấp quyền sử dụng. Khi đăng nhập, truy cập hoặc thực
              hiện thao tác trên hệ thống, người dùng được xem là đã đọc, hiểu
              và đồng ý tuân thủ các điều khoản dưới đây.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              2. Mục đích sử dụng hệ thống
            </h2>
            <p className="mt-2">
              DK HRM được xây dựng nhằm hỗ trợ quản lý nhân sự nội bộ, bao gồm
              quản lý hồ sơ nhân viên, phòng ban, công ty, hợp đồng, ngày phép,
              chấm công, tuyển dụng và các nghiệp vụ liên quan. Người dùng chỉ
              được sử dụng hệ thống cho mục đích công việc hợp lệ và trong phạm
              vi trách nhiệm được giao.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              3. Tài khoản và quyền truy cập
            </h2>
            <p className="mt-2">
              Mỗi tài khoản được cấp theo vai trò công việc, đơn vị phụ trách và
              phạm vi phân quyền. Người dùng chỉ được xem, tạo, chỉnh sửa, xuất
              hoặc xóa dữ liệu khi có quyền phù hợp. Mọi hành vi sử dụng tài
              khoản của người khác, cho mượn tài khoản, chia sẻ mật khẩu hoặc cố
              tình vượt quyền đều không được phép.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              4. Bảo mật thông tin đăng nhập
            </h2>
            <p className="mt-2">
              Người dùng có trách nhiệm bảo vệ tên đăng nhập, mật khẩu, thiết bị
              đã đăng nhập và phiên làm việc của mình. Khi nghi ngờ tài khoản bị
              lộ, bị truy cập trái phép hoặc phát sinh hoạt động bất thường,
              người dùng cần đổi mật khẩu và thông báo cho quản trị viên hoặc bộ
              phận phụ trách hệ thống trong thời gian sớm nhất.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              5. Trách nhiệm nhập liệu và cập nhật dữ liệu
            </h2>
            <p className="mt-2">
              Người dùng cần nhập dữ liệu chính xác, đầy đủ, đúng định dạng và
              đúng thời điểm. Trước khi lưu hoặc gửi thông tin, người dùng cần
              kiểm tra lại nội dung để hạn chế sai sót. Các thông tin như hồ sơ
              nhân viên, chức vụ, phòng ban, hợp đồng, ngày phép và trạng thái
              làm việc cần được cập nhật kịp thời khi có thay đổi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              6. Sử dụng dữ liệu trong hệ thống
            </h2>
            <p className="mt-2">
              Dữ liệu trong DK HRM là dữ liệu phục vụ hoạt động quản lý nội bộ.
              Người dùng không được sử dụng dữ liệu cho mục đích cá nhân, thương
              mại, gây bất lợi cho tổ chức hoặc chia sẻ cho bên thứ ba nếu chưa
              có sự cho phép hợp lệ. Việc sao chép, tải xuống, chụp màn hình
              hoặc chuyển tiếp dữ liệu cần tuân thủ quy định bảo mật nội bộ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              7. Hành vi không được phép
            </h2>
            <p className="mt-2">
              Người dùng không được cố ý làm sai lệch dữ liệu, xóa dữ liệu không
              thuộc trách nhiệm của mình, truy cập trái phép, dò tìm lỗ hổng,
              can thiệp vào luồng xử lý, làm gián đoạn hệ thống hoặc thực hiện
              các hành vi có thể ảnh hưởng đến tính toàn vẹn, bảo mật và khả
              dụng của hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              8. Nhật ký hoạt động và kiểm tra hệ thống
            </h2>
            <p className="mt-2">
              Hệ thống có thể ghi nhận nhật ký đăng nhập, thời điểm truy cập,
              thao tác tạo, sửa, xóa dữ liệu và các hoạt động quan trọng khác.
              Nhật ký này được sử dụng để phục vụ vận hành, hỗ trợ kỹ thuật,
              kiểm tra sai lệch dữ liệu, điều tra sự cố và bảo vệ an toàn hệ
              thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              9. Tạm dừng, giới hạn hoặc thu hồi quyền truy cập
            </h2>
            <p className="mt-2">
              Quyền truy cập có thể bị tạm dừng, giới hạn hoặc thu hồi khi người
              dùng thay đổi vị trí công việc, nghỉ việc, không còn nhu cầu sử
              dụng, vi phạm điều khoản hoặc khi hệ thống cần bảo trì, nâng cấp,
              xử lý sự cố kỹ thuật hay sự cố bảo mật.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              10. Bảo trì và tính sẵn sàng của hệ thống
            </h2>
            <p className="mt-2">
              DK HRM có thể được bảo trì định kỳ hoặc đột xuất để nâng cấp tính
              năng, sửa lỗi, cải thiện hiệu năng và tăng cường bảo mật. Trong
              thời gian bảo trì hoặc khi backend, mạng, hạ tầng gặp sự cố, một
              số tính năng có thể tạm thời không khả dụng.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              11. Xử lý vi phạm
            </h2>
            <p className="mt-2">
              Tùy theo mức độ vi phạm, người dùng có thể bị nhắc nhở, giới hạn
              quyền, khóa tài khoản tạm thời, thu hồi quyền truy cập hoặc áp
              dụng các biện pháp xử lý theo quy định nội bộ. Các hành vi gây
              thiệt hại về dữ liệu, bảo mật hoặc hoạt động vận hành có thể được
              xem xét trách nhiệm theo quy định liên quan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              12. Thay đổi điều khoản
            </h2>
            <p className="mt-2">
              Điều khoản sử dụng có thể được cập nhật theo nhu cầu vận hành,
              thay đổi quy trình quản trị hoặc yêu cầu bảo mật. Phiên bản mới có
              hiệu lực khi được công bố trên hệ thống. Người dùng nên kiểm tra
              định kỳ để nắm các thay đổi mới nhất khi tiếp tục sử dụng DK HRM.
            </p>
          </section>
        </div>

        <PolicyBackButton className="mt-8" />
      </div>
    </main>
  );
}
