import PolicyBackButton from "../policy-back-button";

const clauses = [
  {
    title: "1. Mục đích",
    paragraphs: [
      "Điều khoản này thiết lập nguyên tắc, trách nhiệm và giới hạn khi truy cập, ghi nhận, tra cứu, cập nhật và quản lý thông tin trên ứng dụng Hồ sơ lô (sau đây gọi là “Ứng dụng”) do Công ty Cổ phần Dược Khoa cung cấp.",
      "Ứng dụng hỗ trợ quản lý thông tin sản phẩm, nguyên liệu, lệnh sản xuất, hồ sơ theo dõi theo công đoạn, kiểm tra chất lượng, sai lệch, tổng kết và các tài liệu liên quan đến quá trình sản xuất. Mục đích của Điều khoản là giúp người dùng sử dụng hệ thống đúng nhiệm vụ, bảo đảm dữ liệu được ghi nhận có trách nhiệm, bảo vệ thông tin và hỗ trợ khả năng tra cứu hồ sơ.",
    ],
  },
  {
    title: "2. Phạm vi áp dụng",
    paragraphs: [
      "Điều khoản áp dụng cho nhân viên, quản lý, bộ phận chất lượng, sản xuất, kho, kỹ thuật, quản trị viên và cá nhân khác được cấp tài khoản. Khi đăng nhập hoặc tiếp tục sử dụng Ứng dụng, người dùng xác nhận đã đọc và sẽ tuân thủ các quy định này cùng quy trình, hướng dẫn công việc và chính sách nội bộ có liên quan.",
      "Nếu có khác biệt giữa nội dung hiển thị trên Ứng dụng và quy trình được phê duyệt, người dùng phải thực hiện theo quy trình được phê duyệt và báo cho quản lý hoặc đầu mối quản trị để kiểm tra, cập nhật dữ liệu hệ thống.",
    ],
  },
  {
    title: "3. Giải thích thuật ngữ",
    paragraphs: [
      "“Hồ sơ lô” là tập hợp thông tin, biểu mẫu, kết quả kiểm tra, xác nhận, tài liệu và lịch sử liên quan đến một lệnh hoặc lô sản xuất trong phạm vi Ứng dụng. “Dữ liệu” bao gồm nội dung văn bản, số liệu, ngày giờ, lựa chọn trạng thái, hình ảnh, tệp đính kèm và thông tin nhận diện người thực hiện được lưu hoặc hiển thị trong Ứng dụng.",
      "“Người dùng” là cá nhân được cấp quyền truy cập. “Quản trị viên” là người được giao quản lý tài khoản, phân quyền hoặc cấu hình hệ thống. “Quản lý hồ sơ” là cá nhân/bộ phận có trách nhiệm kiểm tra, xác nhận hoặc xử lý hồ sơ theo phân công và quy trình nội bộ.",
    ],
  },
  {
    title: "4. Nguyên tắc sử dụng",
    paragraphs: [
      "Người dùng chỉ sử dụng Ứng dụng cho nhiệm vụ công việc được giao, trong phạm vi quyền hạn và đúng mục đích nghiệp vụ. Người dùng phải tuân thủ quy trình thao tác, quy định chất lượng, an toàn thông tin, lưu trữ hồ sơ và các hướng dẫn được Công ty ban hành.",
      "Ứng dụng là công cụ hỗ trợ ghi nhận, tra cứu và phối hợp công việc. Việc hiển thị trạng thái hoặc dữ liệu trên màn hình không tự nó cấu thành việc phê duyệt, giải phóng lô, cho phép xuất kho hay thay thế chữ ký, biểu mẫu hoặc bước kiểm soát bắt buộc theo quy trình đã được phê duyệt.",
    ],
  },
  {
    title: "5. Tài khoản và phân quyền",
    paragraphs: [
      "Tài khoản được cấp theo danh tính cá nhân, vị trí công việc, bộ phận và nhu cầu nghiệp vụ. Mỗi người dùng phải sử dụng tài khoản của chính mình; không dùng chung, cho mượn, chuyển giao hoặc đăng nhập thay người khác. Người dùng không được tự ý tìm cách truy cập chức năng, hồ sơ hoặc dữ liệu ngoài phạm vi được cấp.",
      "Quyền xem, tạo, cập nhật, xác nhận, xuất hoặc xóa dữ liệu được giới hạn theo cấu hình phân quyền. Việc một chức năng xuất hiện hoặc có thể truy cập do lỗi cấu hình không đồng nghĩa người dùng được phép sử dụng chức năng đó. Nếu phát hiện quyền không phù hợp, hãy ngừng thao tác và đề nghị quản lý/đầu mối quản trị điều chỉnh.",
      "Quản lý và bộ phận phụ trách cần thông báo kịp thời khi nhân sự thay đổi vị trí, nghỉ việc, chuyển bộ phận hoặc không còn nhu cầu sử dụng để quyền truy cập được rà soát, sửa đổi hoặc thu hồi.",
    ],
  },
  {
    title: "6. Bảo vệ thông tin đăng nhập và thiết bị",
    paragraphs: [
      "Người dùng chịu trách nhiệm bảo mật mật khẩu, mã xác thực, phiên đăng nhập và thiết bị dùng để truy cập. Không ghi mật khẩu ở nơi dễ thấy, gửi thông tin đăng nhập qua kênh không được phép hoặc lưu trên thiết bị dùng chung nếu chưa có biện pháp bảo vệ phù hợp.",
      "Khi rời khỏi thiết bị, người dùng cần khóa màn hình hoặc đăng xuất. Không bỏ qua cảnh báo bảo mật, không cài tiện ích/chương trình không được phép nhằm can thiệp vào Ứng dụng và không truy cập qua thiết bị hoặc mạng không an toàn nếu có lựa chọn phù hợp hơn.",
      "Nếu nghi ngờ lộ mật khẩu, mất thiết bị, có người khác sử dụng tài khoản hoặc phát hiện đăng nhập bất thường, người dùng cần đổi mật khẩu (nếu có thể), thông báo ngay cho quản lý hoặc đầu mối hỗ trợ và cung cấp thời điểm, thiết bị, hành động đáng ngờ để phục vụ xử lý.",
    ],
  },
  {
    title: "7. Trách nhiệm nhập và cập nhật hồ sơ",
    paragraphs: [
      "Người nhập dữ liệu phải có thẩm quyền và hiểu nội dung được ghi. Trước khi lưu, người dùng cần đối chiếu với nguồn được phê duyệt, kiểm tra mã sản phẩm, số lô, lệnh sản xuất, nguyên liệu, đơn vị tính, ngày giờ, số lượng và các trường bắt buộc. Dữ liệu phải đầy đủ, chính xác, khách quan, dễ hiểu và được ghi nhận kịp thời tại thời điểm công việc phát sinh theo quy trình áp dụng.",
      "Không nhập liệu suy đoán, làm tròn hoặc sao chép từ lô khác nếu việc đó làm sai lệch ý nghĩa hồ sơ. Không để người khác ghi nhận thay phần việc mình chưa thực hiện. Nếu dữ liệu được nhập bởi người hỗ trợ, phải bảo đảm quy trình nội bộ cho phép và thông tin về người thực hiện/xác nhận được ghi đúng.",
      "Người dùng chịu trách nhiệm kiểm tra dữ liệu do mình tạo hoặc cập nhật. Người rà soát/phê duyệt chịu trách nhiệm thực hiện kiểm tra trong phạm vi nhiệm vụ được giao; việc xem hồ sơ không mặc nhiên xác nhận mọi nội dung là đúng nếu chưa hoàn thành bước rà soát theo quy trình.",
    ],
  },
  {
    title: "8. Sửa đổi, bổ sung và xử lý sai sót",
    paragraphs: [
      "Khi phát hiện dữ liệu sai, thiếu, trùng hoặc gắn nhầm hồ sơ, người dùng phải thông báo theo quy trình và sử dụng chức năng sửa đổi được cấp. Không che giấu sai sót, ghi đè để làm mất dấu vết, xóa nội dung nhằm tránh rà soát hoặc tạo dữ liệu mới để thay thế một cách không được phép.",
      "Mọi sửa đổi phải có căn cứ và lý do phù hợp với trường hợp nghiệp vụ. Nếu quy trình yêu cầu, cần ghi rõ nội dung trước/sau, thời điểm, người đề nghị, người xác nhận và tài liệu chứng minh. Nếu chức năng sửa/xóa không đáp ứng yêu cầu kiểm soát, không tự xử lý bằng cách sửa trực tiếp cơ sở dữ liệu hoặc nhờ người không có thẩm quyền; hãy mở yêu cầu hỗ trợ.",
      "Người dùng không được tự ý xóa hoặc hủy hồ sơ đã phát sinh. Việc hủy, khóa, mở lại hoặc điều chỉnh hồ sơ phải do người có thẩm quyền thực hiện theo quy trình kiểm soát hồ sơ và phải bảo toàn dấu vết cần thiết.",
    ],
  },
  {
    title: "9. Theo dõi công đoạn và kết quả kiểm tra",
    paragraphs: [
      "Các biểu mẫu theo công đoạn, thông số vận hành, kiểm tra trong quá trình, kiểm tra môi trường, vệ sinh, đóng gói, lấy mẫu và tổng kết phải được ghi đúng biểu mẫu, đúng lô và bởi người được phân công. Kết quả phải phản ánh quan sát hoặc phép đo thực tế, kèm đơn vị, thời điểm, thiết bị đo hoặc thông tin liên quan khi biểu mẫu/quy trình yêu cầu.",
      "Không sửa kết quả để đạt giới hạn, không bỏ qua kết quả ngoài tiêu chuẩn, không nhập kết quả đo thay cho người thực hiện và không ghi nhận bước kiểm tra chưa diễn ra. Kết quả bất thường, vượt giới hạn, thiếu dữ liệu hoặc không thể xác minh phải được báo cáo và xử lý theo quy trình kiểm soát chất lượng, sai lệch và hành động khắc phục/phòng ngừa của Công ty.",
      "Các giá trị giới hạn, hướng dẫn thao tác, công thức, mẫu in hoặc cấu hình được hiển thị phải được đối chiếu với phiên bản đang có hiệu lực. Khi phát hiện thông tin không khớp, ngừng sử dụng phần thông tin bị nghi ngờ và báo bộ phận phụ trách.",
    ],
  },
  {
    title: "10. Sai lệch, sự cố và nội dung cần điều tra",
    paragraphs: [
      "Sai lệch, kết quả bất thường, nhầm lẫn dữ liệu, mất tài liệu, lỗi liên kết hồ sơ hoặc dấu hiệu truy cập trái phép phải được thông báo kịp thời cho quản lý và bộ phận có trách nhiệm. Người dùng cần ghi nhận sự kiện trung thực, giữ nguyên tài liệu/chứng cứ liên quan và không tự ý kết luận nguyên nhân hoặc đóng xử lý nếu chưa được giao thẩm quyền.",
      "Việc tạo, phân loại, điều tra, đánh giá ảnh hưởng, đề xuất xử lý, phê duyệt và xác nhận hoàn tất phải tuân theo quy trình nội bộ tương ứng. Thông tin trên Ứng dụng hỗ trợ quá trình này nhưng không thay thế các bước điều tra, đánh giá rủi ro hoặc thông báo bắt buộc khác.",
    ],
  },
  {
    title: "11. Xác nhận, rà soát và trạng thái hồ sơ",
    paragraphs: [
      "Người xác nhận hoặc phê duyệt chỉ thực hiện thao tác khi đã được phân quyền, đã rà soát nội dung theo trách nhiệm và có đủ căn cứ. Không sử dụng tài khoản người khác để xác nhận; không yêu cầu người khác xác nhận trước khi hoàn thành bước rà soát; không đánh dấu hoàn tất chỉ để bỏ cảnh báo hoặc phục vụ tiến độ.",
      "Trạng thái như đang thực hiện, chờ rà soát, hoàn tất hoặc đã gửi là chỉ báo quy trình trên hệ thống. Trạng thái đó không tự thay thế phê duyệt theo quy trình chất lượng, chữ ký có hiệu lực, hồ sơ giấy, kiểm soát phát hành hoặc quyết định của người có thẩm quyền nếu các bước này vẫn được yêu cầu.",
    ],
  },
  {
    title: "12. Tài liệu, hình ảnh, mã QR và dữ liệu đính kèm",
    paragraphs: [
      "Tệp tải lên phải liên quan đến công việc, đúng hồ sơ, rõ ràng, đọc được và không chứa mã độc. Người tải lên cần kiểm tra tên tệp, nội dung, phiên bản, khả năng nhận diện lô/sản phẩm và quyền sử dụng tài liệu. Không tải lên tài liệu cá nhân, dữ liệu nhạy cảm không cần thiết hoặc tài liệu của bên khác nếu chưa có căn cứ và quyền phù hợp.",
      "Mã QR, mã vạch hoặc liên kết chỉ là phương tiện tra cứu đến dữ liệu tương ứng; người dùng phải xác minh sản phẩm, lô, thiết bị hoặc đối tượng hiển thị trước khi thao tác. Không tự tạo, sửa, phát tán hoặc sử dụng mã để truy cập hồ sơ ngoài phạm vi được cấp.",
      "Không coi bản xem trước, bản tải xuống, ảnh chụp màn hình hoặc bản in là bản kiểm soát chính thức nếu chưa được phát hành/kiểm soát theo quy trình tài liệu của Công ty.",
    ],
  },
  {
    title: "13. Tra cứu, xuất dữ liệu và bảo mật thông tin",
    paragraphs: [
      "Dữ liệu trong Ứng dụng chỉ được tra cứu, xuất, in, sao chép hoặc gửi cho cá nhân/bộ phận có nhu cầu công việc và được phép tiếp nhận. Trước khi chia sẻ, người dùng phải kiểm tra người nhận, phạm vi dữ liệu, mục đích, kênh truyền và các yêu cầu bảo mật hiện hành.",
      "Không đăng dữ liệu lên mạng xã hội, dịch vụ lưu trữ cá nhân, công cụ AI hoặc ứng dụng bên ngoài chưa được Công ty cho phép; không chuyển hồ sơ qua email/tài khoản cá nhân; không chụp ảnh hoặc ghi lại màn hình khu vực có dữ liệu nếu không có mục đích công việc hợp lệ. Khi cần cung cấp hồ sơ cho bên ngoài, phải được người có thẩm quyền chấp thuận và thực hiện theo quy trình chia sẻ thông tin.",
    ],
  },
  {
    title: "14. Nhật ký và khả năng truy xuất",
    paragraphs: [
      "Ứng dụng hoặc hạ tầng liên quan có thể ghi nhận thông tin tài khoản, thời điểm, thiết bị/kết nối ở mức cần thiết, thao tác và thay đổi dữ liệu để vận hành, bảo mật, hỗ trợ, truy xuất hồ sơ và điều tra sự cố. Người dùng không được can thiệp, xóa, làm giả hoặc né tránh việc ghi nhận này.",
      "Nhật ký hệ thống không nhất thiết thể hiện toàn bộ bối cảnh nghiệp vụ và không tự chứng minh một thao tác vật lý đã được thực hiện. Việc sử dụng nhật ký để rà soát phải được giới hạn cho mục đích công việc, đúng thẩm quyền và theo quy định nội bộ về bảo mật, lưu trữ và tiếp cận thông tin.",
    ],
  },
  {
    title: "15. Hành vi bị nghiêm cấm",
    paragraphs: [
      "Người dùng không được: truy cập trái phép hoặc dò tìm lỗ hổng; phá hoại, làm gián đoạn hoặc làm quá tải hệ thống; cài mã độc; giải mã, thay đổi chương trình hoặc giao tiếp API ngoài phạm vi được phép; tự ý trích xuất dữ liệu hàng loạt; giả mạo danh tính hoặc dấu vết; làm sai lệch hồ sơ; xóa dữ liệu trái phép; sử dụng tài khoản của người khác; hoặc hỗ trợ người khác thực hiện các hành vi này.",
      "Không được sử dụng Ứng dụng để lưu trữ nội dung trái pháp luật, quấy rối, đe dọa, phân biệt đối xử, quảng cáo không liên quan hoặc xâm phạm quyền và lợi ích hợp pháp của cá nhân/tổ chức. Người dùng cần thông báo khi phát hiện hành vi vi phạm hoặc điểm yếu có thể ảnh hưởng đến dữ liệu và hoạt động hệ thống.",
    ],
  },
  {
    title: "16. Lưu trữ, sao lưu và thời hạn lưu hồ sơ",
    paragraphs: [
      "Hồ sơ được lưu trữ, sao lưu, phục hồi, khóa hoặc hủy theo chính sách lưu trữ hồ sơ, yêu cầu chất lượng, quy định pháp luật áp dụng và kế hoạch vận hành của Công ty. Thời hạn có thể khác nhau theo loại hồ sơ và yêu cầu nghiệp vụ; điều khoản này không đặt ra một thời hạn lưu cụ thể thay cho chính sách đó.",
      "Người dùng không được tự ý coi dữ liệu còn hiển thị là đã được lưu trữ vĩnh viễn, hoặc coi bản tải xuống là bản sao lưu được bảo đảm. Khi dữ liệu quan trọng bị mất, không truy cập được hoặc có nguy cơ bị ghi đè, cần báo ngay cho đầu mối hỗ trợ; không tự thử các thao tác khôi phục có thể làm tình trạng nghiêm trọng hơn.",
    ],
  },
  {
    title: "17. Khả năng sẵn sàng, bảo trì và hỗ trợ",
    paragraphs: [
      "Ứng dụng có thể tạm ngừng hoặc hoạt động hạn chế do bảo trì, nâng cấp, sự cố mạng, máy chủ, dịch vụ tích hợp, thiết bị hoặc nguyên nhân ngoài khả năng kiểm soát hợp lý. Công ty sẽ xử lý theo mức độ ưu tiên vận hành và thông báo khi phù hợp; không bảo đảm hệ thống luôn không gián đoạn hoặc mọi dữ liệu luôn có thể truy cập tức thời.",
      "Khi hệ thống không khả dụng, người dùng phải làm theo phương án dự phòng và hướng dẫn đã được phê duyệt. Không tự tạo biểu mẫu thay thế hoặc nhập bù theo cách không kiểm soát. Sau khi hệ thống hoạt động lại, việc cập nhật hồ sơ phát sinh trong thời gian gián đoạn phải thực hiện theo hướng dẫn để tránh trùng lặp và bảo toàn thời điểm/người thực hiện.",
      "Yêu cầu hỗ trợ cần mô tả chức năng, mã lô hoặc thiết bị liên quan, thời điểm, thao tác đã thực hiện và thông báo lỗi. Không gửi mật khẩu, mã xác thực hoặc dữ liệu vượt quá mức cần thiết trong yêu cầu hỗ trợ.",
    ],
  },
  {
    title: "18. Quyền sở hữu và sử dụng hệ thống",
    paragraphs: [
      "Giao diện, phần mềm, cấu trúc, tài liệu hướng dẫn, nhãn hiệu và nội dung do Công ty hoặc bên cấp phép cung cấp được bảo vệ theo quyền tương ứng. Người dùng chỉ được sử dụng các thành phần này cho mục đích công việc được phép; không sao chép, phân phối, khai thác thương mại hoặc tạo sản phẩm phái sinh nếu chưa được chấp thuận bằng văn bản.",
      "Dữ liệu nghiệp vụ do Công ty quản lý không được xem là tài sản cá nhân của người dùng chỉ vì người dùng đã nhập, xem hoặc tải dữ liệu đó. Mọi quyền tiếp cận và sử dụng dữ liệu phải tuân theo phân quyền và chính sách nội bộ.",
    ],
  },
  {
    title: "19. Xử lý vi phạm và thu hồi quyền truy cập",
    paragraphs: [
      "Tùy mức độ, tính chất, hậu quả và quy định nội bộ, hành vi vi phạm có thể dẫn đến nhắc nhở, yêu cầu khắc phục, rà soát quyền, tạm khóa hoặc thu hồi tài khoản, điều tra sự cố và áp dụng biện pháp xử lý phù hợp. Việc xử lý không làm mất nghĩa vụ bảo vệ dữ liệu hoặc phối hợp khắc phục của người dùng.",
      "Công ty có thể tạm giới hạn quyền truy cập khi cần bảo vệ người dùng, dữ liệu hoặc tính ổn định của hệ thống, xử lý sự cố bảo mật, thực hiện bảo trì hoặc theo yêu cầu của người có thẩm quyền. Khi quan hệ công việc hoặc nhu cầu truy cập kết thúc, tài khoản có thể bị thu hồi theo quy trình nội bộ.",
    ],
  },
  {
    title: "20. Báo cáo vấn đề và kênh liên hệ",
    paragraphs: [
      "Người dùng cần báo cho quản lý trực tiếp, bộ phận Chất lượng hoặc đầu mối quản trị/hỗ trợ hệ thống khi phát hiện sai lệch hồ sơ, lộ lọt dữ liệu, tài khoản bất thường, lỗi ảnh hưởng đến tính đúng đắn của hồ sơ, hoặc nội dung điều khoản chưa rõ. Khi báo cáo, chỉ gửi thông tin cần thiết và tránh đính kèm dữ liệu nhạy cảm qua kênh chưa được phê duyệt.",
      "Thông tin đầu mối và quy trình báo cáo cụ thể được Công ty công bố qua kênh nội bộ. Nếu chưa biết đầu mối phù hợp, người dùng cần hỏi quản lý trực tiếp để được hướng dẫn.",
    ],
  },
  {
    title: "21. Cập nhật và hiệu lực điều khoản",
    paragraphs: [
      "Điều khoản có thể được cập nhật khi chức năng, quy trình nội bộ hoặc yêu cầu bảo mật thay đổi. Phiên bản mới được công bố trên Ứng dụng hoặc qua kênh nội bộ chính thức; nội dung cập nhật áp dụng từ thời điểm được thông báo, trừ khi có ghi rõ thời điểm khác.",
      "Nếu một nội dung không thể áp dụng trong một trường hợp cụ thể, các nội dung còn lại vẫn được duy trì trong phạm vi phù hợp. Việc tiếp tục sử dụng sau khi phiên bản mới được công bố đồng nghĩa người dùng đã được thông báo về nội dung cập nhật; nếu có thắc mắc, hãy trao đổi với quản lý hoặc đầu mối phụ trách trước khi thực hiện thao tác liên quan.",
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
            Cập nhật lần cuối: 26/09/2026
          </p>
          <p className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
            Tài liệu này quy định cách sử dụng nội bộ ứng dụng Hồ sơ lô. Người dùng
            cần đồng thời tuân thủ quy trình sản xuất, kiểm soát chất lượng, quản
            lý hồ sơ và bảo mật đang có hiệu lực tại Công ty.
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
            </section>
          ))}
        </div>

        <PolicyBackButton className="mt-8" />
      </div>
    </main>
  );
}
