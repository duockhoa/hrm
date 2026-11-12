import PolicyBackButton from "../policy-back-button";
import thirdPartyLibraries from "./third-party-libraries.json";

const clauses: {
  title: string;
  paragraphs: string[];
  articles?: { title: string; paragraphs: string[]; bullets?: string[] }[];
}[] = [
  {
    title: "1. Mục đích",
    paragraphs: [
      "Đảm bảo người dùng được cung cấp tài liệu và có thể tiếp cận các điều khoản sử dụng của phần mềm EBR (ứng dụng Hồ sơ lô, sau đây gọi là “Ứng dụng”); bảo vệ quyền và lợi ích hợp pháp của tất cả người dùng.",
      "Xác định và bảo vệ quyền sở hữu hợp pháp của Công ty Cổ phần Dược Khoa đối với dữ liệu thuộc phạm vi quyền sở hữu của Công ty; ghi nhận mã nguồn và thiết kế phần mềm EBR thuộc sở hữu của nhà phát triển Phạm Văn Bình, ngoại trừ các thư viện và thành phần của bên thứ ba được sử dụng theo giấy phép tương ứng.",
      "Ghi nhận và trích dẫn thông tin về các tác giả, nhà cung cấp thư viện và mã nguồn mở được sử dụng trong quá trình xây dựng phần mềm EBR; đảm bảo tuân thủ các điều kiện cấp phép và tôn trọng quyền sở hữu trí tuệ của các bên liên quan.",
    ],
  },
  {
    title: "2. Phạm vi áp dụng",
    paragraphs: [
      "Các điều khoản sử dụng trong tài liệu này áp dụng cho tất cả các phiên bản phần mềm EBR được triển khai.",
      "Điều khoản sử dụng được cập nhật và áp dụng cho từng phiên bản phần mềm EBR được triển khai; nội dung điều khoản có thể thay đổi theo từng mã phiên bản phần mềm.",
    ],
  },
  {
    title: "3. Thuật ngữ và viết tắt",
    paragraphs: [
      "Trong tài liệu này, các thuật ngữ và từ viết tắt được hiểu như sau:",
      "EBR (Electronic Batch Record): hồ sơ lô điện tử. Trong tài liệu này, “phần mềm EBR” hoặc “Ứng dụng” là hệ thống phần mềm được triển khai tại Công ty Cổ phần Dược Khoa để hỗ trợ ghi nhận, quản lý và tra cứu hồ sơ lô sản xuất.",
      "Công ty: Công ty Cổ phần Dược Khoa, đơn vị sử dụng và quản lý hoạt động triển khai phần mềm EBR.",
      "Người dùng: cá nhân được cấp tài khoản và quyền sử dụng phần mềm EBR theo nhiệm vụ, vai trò và phạm vi được phân công.",
      "Quản trị viên: nhân sự được Công ty giao nhiệm vụ quản trị hệ thống, quản lý tài khoản, phân quyền, vận hành và bảo trì phần mềm trong phạm vi được giao.",
      "CEO (Chief Executive Officer): Tổng Giám đốc của Công ty Cổ phần Dược Khoa.",
      "Nhà phát triển: ông Phạm Văn Bình, người phát triển và sở hữu mã nguồn, thiết kế phần mềm EBR, ngoại trừ các thư viện và thành phần của bên thứ ba được sử dụng theo giấy phép tương ứng.",
      "Hồ sơ lô: tập hợp thông tin, biểu mẫu, kết quả kiểm tra, xác nhận và tài liệu liên quan đến quá trình sản xuất, kiểm soát và theo dõi một lô sản phẩm.",
      "Dữ liệu: toàn bộ thông tin được tạo lập, nhập, tải lên hoặc lưu trữ trên phần mềm EBR, bao gồm nội dung hồ sơ lô, thông tin người dùng, tệp đính kèm và lịch sử thao tác.",
      "Mã nguồn: tập hợp các tệp lệnh, chương trình và cấu hình do nhà phát triển tạo lập để xây dựng, vận hành và bảo trì phần mềm.",
      "Giấy phép sử dụng: sự cho phép người dùng truy cập và sử dụng phần mềm trong phạm vi, thời hạn và điều kiện được quy định; không đồng nghĩa với việc chuyển giao quyền sở hữu phần mềm hoặc mã nguồn.",
      "Thành phần mã nguồn mở: thư viện, công cụ hoặc đoạn mã của bên thứ ba được cung cấp theo giấy phép mã nguồn mở; việc sử dụng, sửa đổi và phân phối phải tuân theo điều kiện của giấy phép tương ứng.",
      "Phiên bản phần mềm: bản phát hành của phần mềm EBR được nhận diện bằng mã phiên bản, dùng để xác định chức năng, thay đổi và điều khoản sử dụng áp dụng.",
      "Dịch vụ EBR: hoạt động cung cấp quyền truy cập và sử dụng phần mềm EBR trong phạm vi triển khai tại Công ty.",
    ],
  },
  {
    title: "4. Điều khoản",
    paragraphs: [],
    articles: [
      {
        title: "4.1. Hành vi bị cấm",
        paragraphs: [
          "Khi sử dụng phần mềm EBR, người dùng không được thực hiện các hành vi sau:",
        ],
        bullets: [
          "Lợi dụng lỗi hoặc khai thác lỗ hổng hệ thống để truy cập trái phép, chiếm quyền điều khiển, thu thập dữ liệu hoặc gây gián đoạn hoạt động của phần mềm.",
          "Xâm phạm quyền sở hữu trí tuệ của tác giả, chủ sở hữu phần mềm hoặc bên thứ ba, bao gồm việc sao chép, sửa đổi, phân phối hoặc sử dụng mã nguồn, tài liệu và nội dung khi chưa được phép hoặc trái với điều kiện cấp phép áp dụng.",
          "Đăng tải, lưu trữ hoặc chia sẻ nội dung xúc phạm, quấy rối, đe dọa, kỳ thị, kích động thù hận hoặc xâm phạm quyền và lợi ích hợp pháp của người khác.",
          "Giả mạo danh tính, sử dụng trái phép tài khoản của người khác hoặc cung cấp thông tin sai lệch nhằm mạo danh cá nhân, tổ chức.",
          "Tải lên, cài đặt, đính kèm hoặc phát tán mã độc, tệp hay liên kết độc hại gây ảnh hưởng đến hệ thống, dữ liệu hoặc thiết bị của người dùng khác.",
          "Sử dụng phần mềm sai mục đích hoặc để thực hiện, hỗ trợ các hoạt động trái pháp luật, bao gồm buôn lậu, trốn thuế, kích động hoặc thực hiện bạo lực, mua bán người và mua bán trái phép chất cấm.",
          "Lạm dụng chức năng gửi email, thông báo hoặc các chức năng liên lạc khác của phần mềm để gửi thư rác, nội dung lặp lại hoặc nội dung không liên quan đến công việc nhằm quấy rối, làm phiền người khác.",
        ],
      },
      {
        title: "4.2. Quyền sở hữu trí tuệ",
        paragraphs: [
          "Mã nguồn và thiết kế phần mềm EBR thuộc quyền sở hữu trí tuệ của nhà phát triển Phạm Văn Bình, ngoại trừ các thư viện và thành phần của bên thứ ba được sử dụng theo giấy phép tương ứng. Nghiêm cấm sao chép, sửa đổi, phân phối hoặc chuyển giao các thành phần thuộc sở hữu của nhà phát triển khi chưa được ông Phạm Văn Bình chấp thuận bằng văn bản, trừ trường hợp pháp luật cho phép.",
          "Quyền sở hữu trí tuệ đối với các thư viện, mã nguồn mở và thành phần của bên thứ ba thuộc về các chủ sở hữu tương ứng; việc sử dụng, sao chép hoặc phân phối các thành phần này phải tuân thủ điều kiện cấp phép áp dụng.",
        ],
      },
      {
        title: "4.3. Chấm dứt sử dụng",
        paragraphs: [],
        bullets: [
          "Quản trị viên có quyền thu hồi giấy phép sử dụng và chấm dứt quyền truy cập phần mềm EBR của bất kỳ người dùng nào, bao gồm cả Tổng Giám đốc (CEO), khi phát hiện người dùng vi phạm điều khoản sử dụng hoặc chính sách áp dụng.",
          "Tổng Giám đốc (CEO) có quyền quyết định chấm dứt sử dụng dịch vụ EBR tại bất kỳ thời điểm nào. Khi chấm dứt dịch vụ, quản trị viên có trách nhiệm bàn giao đầy đủ toàn bộ mã nguồn phần mềm, dữ liệu và tài liệu kỹ thuật cho Công ty Cổ phần Dược Khoa hoặc người được Công ty chỉ định tiếp nhận; đồng thời hoàn trả toàn bộ phần cứng, thiết bị đã mượn của Công ty để phục vụ công việc.",
        ],
      },
      {
        title: "4.4. Trả phí, thanh toán và hoàn tiền",
        paragraphs: [],
        bullets: [
          "Giấy phép sử dụng phần mềm EBR được cung cấp miễn phí cho toàn bộ nhân sự của Công ty Cổ phần Dược Khoa cho đến khi chấm dứt dịch vụ, với thời hạn miễn phí tối đa không quá 10 năm.",
          "Hoạt động bảo trì phần mềm do quản trị viên nội bộ của Công ty Cổ phần Dược Khoa thực hiện và duy trì.",
          "Nhà phát triển không có trách nhiệm hoàn tiền cho Công ty Cổ phần Dược Khoa trong bất kỳ trường hợp nào.",
        ],
      },
      {
        title: "4.5. Miễn trừ trách nhiệm",
        paragraphs: [],
        bullets: [
          "Nhà phát triển không chịu trách nhiệm đối với hành vi vi phạm điều khoản sử dụng hoặc chính sách áp dụng của người dùng và các hậu quả phát sinh từ hành vi đó.",
          "Người dùng tự chịu trách nhiệm về toàn bộ thông tin, nội dung và tài liệu do mình đăng tải lên phần mềm EBR, bao gồm tính chính xác, tính hợp pháp và quyền sử dụng các nội dung đó.",
        ],
      },
      {
        title: "4.6. Xử phạt vi phạm điều khoản và chính sách",
        paragraphs: [],
        bullets: [
          "Người dùng vi phạm các quy định tại mục 4.1 của tài liệu này bị cấm sử dụng phần mềm EBR trong thời hạn 30 năm kể từ ngày xảy ra hành vi vi phạm.",
        ],
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-blue-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-md border border-gray-200 bg-white p-6 shadow-md md:p-8">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-sm font-medium text-blue-600">HỒ SƠ LÔ · DK PHARMA</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            Điều khoản sử dụng
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Cập nhật lần cuối: 11/11/2026
          </p>
        </div>

        <div className="mt-6 space-y-7 leading-7 text-gray-700">
          {clauses.map((clause) => (
            <section key={clause.title}>
              <h2 className="text-xl font-semibold text-gray-950">
                {clause.title}
              </h2>
              <div className="mt-2 space-y-3">
                {clause.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              {clause.articles && (
                <div className="mt-4 space-y-5">
                  {clause.articles.map((article) => (
                    <section key={article.title}>
                      <h3 className="text-lg font-semibold text-gray-950">
                        {article.title}
                      </h3>
                      <div className="mt-2 space-y-3">
                        {article.paragraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                      {article.bullets && (
                        <ul className="mt-2 list-disc space-y-2 pl-6">
                          {article.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </section>
          ))}
          <section>
            <h2 className="text-xl font-semibold text-gray-950">
              5. Thư viện bên thứ ba và giấy phép
            </h2>
            <p className="mt-2">
              Phần mềm EBR sử dụng các thành phần mã nguồn mở. Dưới đây là danh
              sách các thư viện được khai báo trực tiếp cho frontend EBR và
              backend, kèm phiên bản và giấy phép tương ứng. Danh sách này chưa
              bao gồm toàn bộ thư viện phụ thuộc gián tiếp và công cụ phát triển.
            </p>
            <div className="mt-4 space-y-5">
              {thirdPartyLibraries.map((group) => (
                <section key={group.title}>
                  <h3 className="text-lg font-semibold text-gray-950">
                    {group.title}
                  </h3>
                  <ul className="mt-2 list-disc space-y-2 pl-6">
                    {group.libraries.map((library) => (
                      <li key={library.name} className="break-words">
                        <a
                          href={library.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
                        >
                          <code>{library.name}</code>
                        </a>{" "}
                        ({library.version}) – {library.license}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="mt-4">
              Giấy phép nêu trên là giấy phép của từng gói thư viện. Các bộ biểu
              tượng được cung cấp qua react-icons có thể có giấy phép riêng theo
              dự án gốc. Vui lòng truy cập kho mã nguồn qua liên kết của từng thư
              viện để xem toàn văn giấy phép, thông báo bản quyền và các điều kiện
              sử dụng liên quan. Quyền sở hữu của các tác giả và bên thứ ba được
              giữ nguyên theo giấy phép tương ứng.
            </p>
          </section>
        </div>

        <PolicyBackButton className="mt-8" />
      </div>
    </main>
  );
}
