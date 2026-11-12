import PolicyBackButton from "../policy-back-button";

const policies = [
  {
    title: "1. Chính sách về người dùng",
    items: [
      "Ứng dụng dành cho người dùng từ đủ 16 tuổi trở lên. Độ tuổi được xác định theo giấy tờ hợp pháp tại Việt Nam.",
      "Người dùng phải là nhân sự của Công ty Cổ phần Dược Khoa và được Công ty cấp mã nhân viên hợp lệ.",
      "Người dùng phải được Công ty Cổ phần Dược Khoa phê duyệt là người dùng cuối của ứng dụng.",
    ],
  },
  {
    title: "2. Yêu cầu về thiết bị",
    items: [
      "Phần mềm hỗ trợ các thiết bị sử dụng hệ điều hành Android, iOS, Windows và macOS.",
      "Phần mềm chỉ hỗ trợ trình duyệt sử dụng nhân Chromium và động cơ JavaScript V8, với phiên bản được phát hành từ năm 2013 trở đi.",
      "Quản trị viên không chịu trách nhiệm xử lý lỗi phát sinh trong các môi trường ngoài phạm vi hỗ trợ và không có trách nhiệm cung cấp thiết bị cho người dùng.",
      "Phần mềm sử dụng kết nối Internet. Quản trị viên không cung cấp dịch vụ Internet và không xử lý các lỗi truy cập do người dùng không có kết nối Internet.",
    ],
  },
  {
    title: "3. Chính sách về quyền riêng tư",
    items: [
      "Thông tin được thu thập: múi giờ của người dùng khi truy cập ứng dụng.",
      "Địa chỉ IP của người dùng khi truy cập ứng dụng.",
      "Thông tin trình duyệt người dùng sử dụng để truy cập ứng dụng.",
      "Các thao tác với phần mềm được thu thập bao gồm xem, sửa, xóa, cuộn, chạm và chụp màn hình trên ứng dụng.",
      "Thông tin được công khai và có thể truy cập mà không cần xác thực bảo mật: ảnh đại diện của người dùng, bao gồm ảnh đại diện ở tất cả các lần thay đổi.",
    ],
  },
  {
    title: "4. Chính sách về sở hữu dữ liệu và mã nguồn",
    items: [
      "Mọi dữ liệu do người dùng cung cấp được lưu trữ trên máy chủ của Công ty Cổ phần Dược Khoa và thuộc sở hữu của Công ty Cổ phần Dược Khoa.",
      "Mã nguồn phần mềm thuộc sở hữu hợp pháp của Công ty Cổ phần Dược Khoa, ngoại trừ các thư viện và thành phần của bên thứ ba được sử dụng theo giấy phép tương ứng.",
    ],
  },
  {
    title: "5. Chính sách về bảo trì, sửa chữa",
    items: [
      "Thời hạn bảo trì: nhà phát triển thực hiện bảo trì ứng dụng cho đến khi Tổng Giám đốc (CEO) thông báo xác nhận chấm dứt dịch vụ, nhưng không quá 10 năm kể từ ngày ứng dụng hoạt động lần đầu tiên.",
      "Yêu cầu về tính năng: quản trị viên và Công ty thỏa thuận việc nâng cấp theo yêu cầu, trên cơ sở đánh giá tính khả thi và đối chiếu với các sản phẩm hiện có trên thị trường.",
      "Yêu cầu về kỹ thuật và phương pháp thực hiện: quản trị viên có quyền từ chối nếu đánh giá công nghệ hoặc phương pháp được đề xuất không phù hợp hoặc gây bất lợi cho phần mềm. Khi có tranh chấp về lựa chọn kỹ thuật, Công ty phải cung cấp đầy đủ tài liệu chứng minh ưu điểm của công nghệ mong muốn áp dụng.",
      "Đầu mối hỗ trợ: mọi người dùng có thể liên hệ trực tiếp với quản trị viên qua số điện thoại 0965155761 để được hướng dẫn thao tác và hỗ trợ sửa lỗi phần mềm.",
      "Thời gian tiếp nhận: 24 giờ mỗi ngày, 7 ngày mỗi tuần, 365 ngày mỗi năm (24/7/365), bao gồm ngoài giờ hành chính, ngày nghỉ, lễ và Tết.",
      "Thời gian phản hồi yêu cầu: không quá 1 giờ kể từ thời điểm người dùng liên hệ.",
      "Thời gian giải quyết sai lệch: không quá 1 ngày đối với lỗi giao diện và không quá 3 ngày đối với lỗi tính năng.",
    ],
  },
  {
    title: "6. Chính sách về sao lưu và khôi phục",
    items: [
      "Dữ liệu được sao lưu định kỳ 3 ngày một lần.",
      "Thời gian lưu trữ mỗi bản sao lưu tối đa là 30 ngày.",
      "Việc khôi phục dữ liệu chỉ được thực hiện khi có yêu cầu trực tiếp của Tổng Giám đốc (CEO).",
    ],
  },
  {
    title: "7. Chính sách riêng của Công ty Cổ phần Dược Khoa",
    introduction: "Công ty quy định về phân quyền sử dụng như sau:",
    items: [
      "Giám đốc có quyền xem toàn bộ dữ liệu.",
      "Người dùng cuối có quyền tiếp cận toàn bộ dữ liệu do chính mình cung cấp.",
      "Bộ phận được yêu cầu có quyền tiếp cận toàn bộ dữ liệu của các yêu cầu gửi đến bộ phận mình.",
      "Người phê duyệt có quyền tiếp cận toàn bộ dữ liệu thuộc thẩm quyền phê duyệt.",
      "Người theo dõi có quyền tiếp cận toàn bộ dữ liệu của các yêu cầu mà mình được liệt kê là người theo dõi.",
      "Trưởng bộ phận, trưởng nhóm và người phụ trách có quyền tiếp cận toàn bộ dữ liệu do nhân viên thuộc phạm vi quản lý của mình cung cấp.",
      "Quyền thực hiện các hoạt động phê duyệt, chuyển tiếp và từ chối được xác định theo bảng danh mục yêu cầu của Công ty Cổ phần Dược Khoa.",
      "Thành viên Ban Giám đốc có quyền ngăn chặn bất kỳ luồng phê duyệt nào. Khi đó, hệ thống phải thông báo cho người dùng và xin xác nhận của Chủ tịch Công đoàn.",
      "Phòng Tổ chức có quyền thêm, sửa và xóa toàn bộ người dùng.",
      "Người tạo đề xuất có quyền hủy đề xuất do mình tạo khi chưa có người phê duyệt.",
      "Không cá nhân nào có quyền sửa hoặc xóa các dữ liệu liên quan đến hoạt động tài chính, kế toán.",
    ],
  },
];

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-gray-200 pb-5">
          <p className="text-sm font-medium text-blue-600">DK Pharma · EBR</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            Chính sách sử dụng phần mềm EBR
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Cập nhật lần cuối: 11/11/2026
          </p>
        </div>

        <div className="mt-8 space-y-8 leading-7 text-gray-700">
          {policies.map((policy) => (
            <section key={policy.title}>
              <h2 className="text-xl font-semibold text-gray-950">
                {policy.title}
              </h2>
              {policy.introduction && <p className="mt-2">{policy.introduction}</p>}
              <ul className="mt-2 list-disc space-y-2 pl-6">
                {policy.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <PolicyBackButton className="mt-8" />
      </div>
    </main>
  );
}
