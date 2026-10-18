import {
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { AuthInfo, CallToolResult } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as z from 'zod/v4';
import { McpToolsService } from './mcp-tools.service';
import { stringArray } from '../mcp-oauth/oauth.config';
import { ITEM_PERMISSIONS } from '../items/items.permissions';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from '../production-order-deviations/production-order-deviations.permissions';
import { deviationSearchSchema } from './mcp-deviation-search';
import { mixingSearchSchema, mixingReadSchema } from './mcp-mixing-search';
import { orderSearchSchema } from './mcp-order-search';
import { productionStatisticsSchema } from './mcp-production-statistics';
import { parameterAnalysisSchema } from './mcp-parameter-analysis';

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private readonly serverInfo = {
    name: 'DKPHARMA APP',
    title: 'DKPHARMA APP',
    version: '1.0.0',
    icons: [
      {
        src: `data:image/png;base64,${readFileSync(
          join(__dirname, '../../../templates/mcp/logo.png'),
        ).toString('base64')}`,
        mimeType: 'image/png',
      },
    ],
  };
  private readonly handler = createMcpHandler(({ authInfo }) =>
    this.createServer(authInfo),
  );
  private readonly nodeHandler = toNodeHandler(this.handler);

  constructor(private readonly tools: McpToolsService) {}

  handleRequest(request: Request, response: Response) {
    // Nest/Express has already parsed JSON; do not read the request stream again.
    return this.nodeHandler(request, response, request.body);
  }

  async onModuleDestroy() {
    await this.handler.close();
  }

  private createServer(auth?: AuthInfo) {
    const server = new McpServer(this.serverInfo, {
      instructions:
        'Tra cứu EBR. Dùng search_production_orders tìm lệnh rồi get_production_order xem hồ sơ lô. Câu hỏi liệt kê lô theo giao nhận hồ sơ, PYCLM, có/chưa có phiếu hoặc trạng thái duyệt dùng bộ lọc search_production_orders; include lấy trạng thái và counts đếm nhóm phiếu cho từng lô trong trang. Thống kê nhiều lô dùng get_production_statistics; thống kê pH/thông số dùng analyze_production_parameters, chọn đúng source và parameter, không tải hàng loạt hồ sơ chi tiết để tự tính. Hai tool thống kê mặc định 30 ngày gần nhất, ngày bắt đầu lệnh, loại lô hủy; muốn toàn bộ thời gian phải all_time=true. Kết quả phân trang theo nhóm; kiểm tra pagination trước khi kết luận đủ nhóm. Thông số tách mã hàng, đơn vị, công đoạn và phiên bản, trung bình theo phép đo, không suy ra đạt chất lượng. Riêng phiếu pha chế/gia công chỉ có số lượng và ids trong sections.mixing_records; muốn đọc phiếu phải gọi get_mixing_records. Dùng search_mixing_records tìm phiếu theo mã hàng/mã lệnh/số lô/thông số/ngày/duyệt, sau đó get_mixing_records theo ids; view=results cho so sánh thông số gọn hơn, view=full để đọc cả phiếu. Mỗi lần đọc tối đa 10 phiếu. Hỏi đếm sai lệch dùng search_production_order_deviations mode=count, xem danh sách dùng mode=list; today=true theo ngày Việt Nam. Dùng search_items/get_item xem cấu hình sản phẩm hiện tại, không tự áp dụng cho lô cũ. Nhóm thiếu quyền có available=false, khác với dữ liệu rỗng. Có dữ liệu khác với đạt chất lượng, có người duyệt khác với xử lý hoàn tất. Chỉ đọc dữ liệu cục bộ và tham chiếu ảnh/tệp.',
    });

    server.registerTool(
      'get_server_info',
      {
        description:
          'Kiểm tra kết nối MCP và xem thông tin server, không truy vấn cơ sở dữ liệu.',
        inputSchema: z.object({}).strict(),
        annotations: readOnlyAnnotations,
      },
      () =>
        this.executeTool('get_server_info', auth, undefined, () =>
          Promise.resolve({
            name: this.serverInfo.name,
            version: this.serverInfo.version,
            authentication: 'oauth2',
            read_only: true,
          }),
        ),
    );

    server.registerTool(
      'search_production_orders',
      {
        description:
          'Tìm lệnh/lô, có phân trang. Lọc mã lệnh chính xác, mã hàng/tiền tố, số lô, trạng thái, loại, kho; today hoặc date_from/date_to theo ngày Việt Nam trên date_field (ngày tạo/bắt đầu hoặc mốc giao nhận/PYCLM). Lọc các mốc cấp/nhận hồ sơ giấy, phiếu kho/kiểm nghiệm và người thực hiện; PYCLM phải xét phiếu mới nhất. presence lọc có/chưa có các nhóm phiếu; has_date_checks và has_production_guide là viết tắt. Hỗ trợ trạng thái duyệt in date/tài liệu, QA/IPC phiếu pha chế, phiếu có kết quả, loại mẫu, công đoạn tổng kết, người duyệt xuất xưởng và sai lệch. include chỉ đọc trạng thái/thời gian các nhóm được yêu cầu; counts chỉ đếm nhóm được yêu cầu cho các lô trong trang, không tải nội dung phiếu. Điều kiện lọc kết hợp AND; có dữ liệu/đã có người duyệt không đồng nghĩa đạt hoặc được xuất xưởng. Mặc định không tính trạng thái phụ. Nhóm có quyền riêng cần quyền đọc để lọc/đếm. Các thuộc tính thêm nằm trong search_info.',
        inputSchema: orderSearchSchema,
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'search_production_orders',
          auth,
          'production-orders.list',
          () =>
            this.tools.searchProductionOrders(
              input,
              stringArray(auth?.extra?.permissions),
            ),
        ),
    );

    server.registerTool(
      'get_production_order',
      {
        description:
          'Lấy hồ sơ lô/lệnh theo id: thông tin chung, số đăng ký, PYCLM/lịch sử lấy mẫu, giao nhận hồ sơ, hướng dẫn, checklist, sai lệch, kiểm tra/tiệt trùng/lọc, đóng gói, tổng kết, xét duyệt và tài liệu. Các nhóm trong sections trả đầy đủ bản ghi theo quyền đọc. Riêng mixing_records chỉ trả total, ids và detail_tool=get_mixing_records, không trả nội dung phiếu pha chế/gia công; cần gọi get_mixing_records để đọc các phiếu đó. Ảnh/tệp chỉ trả tham chiếu. Có dữ liệu không đồng nghĩa đạt hoặc đã duyệt.',
        inputSchema: z
          .object({ id: z.number().int().positive().max(2147483647) })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      ({ id }) =>
        this.executeTool(
          'get_production_order',
          auth,
          'production-orders.read',
          () =>
            this.tools.getProductionOrder(
              id,
              stringArray(auth?.extra?.permissions),
            ),
        ),
    );

    server.registerTool(
      'search_items',
      {
        description:
          'Tìm sản phẩm theo mã, tên hoặc mã DK; item_code lọc chính xác, code_prefix lọc tiền tố mã (TP, BTP...). Bỏ qua sản phẩm đã xóa. Danh sách có phân trang, gồm mã/tên, đơn vị, mã DK và số đăng ký hiện tại.',
        inputSchema: z
          .object({
            query: z.string().trim().min(1).max(100).optional(),
            item_code: z.string().trim().min(1).max(100).optional(),
            code_prefix: z
              .string()
              .trim()
              .min(1)
              .max(50)
              .regex(/^[a-zA-Z]+$/)
              .optional(),
            page: z.number().int().min(1).max(1000000).default(1),
            limit: z.number().int().min(1).max(100).default(20),
          })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool('search_items', auth, ITEM_PERMISSIONS.LIST, () =>
          this.tools.searchItems(input),
        ),
    );

    server.registerTool(
      'get_item',
      {
        description:
          'Lấy đầy đủ thông tin sản phẩm theo item_code từ search_items: mã/tên/đơn vị/mã DK, số đăng ký, thông số sản xuất và giới hạn kiểm soát/cho phép, dòng sản phẩm, dạng bào chế, cấu hình mục hồ sơ bắt buộc/áp dụng, thiết bị và thông số thiết bị. Mẫu pha chế/in date chỉ trả khi có quyền đọc tương ứng; toàn bộ phiên bản có status riêng. Đây là cấu hình hiện tại, không phải dữ liệu hay phiên bản đã lưu của lô. Không tải nội dung ảnh/tệp và không lấy lịch sử lô.',
        inputSchema: z
          .object({ item_code: z.string().trim().min(1).max(100) })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      ({ item_code }) =>
        this.executeTool('get_item', auth, ITEM_PERMISSIONS.READ, () =>
          this.tools.getItem(item_code, stringArray(auth?.extra?.permissions)),
        ),
    );

    server.registerTool(
      'search_production_order_deviations',
      {
        description:
          'Đếm hoặc tra cứu sai lệch trên nhiều lô. Khi chỉ hỏi có bao nhiêu, dùng mode=count để đếm trực tiếp trong database. mode=list trả đầy đủ nội dung/nguyên nhân/xử lý, số lượng/đơn vị, người báo cáo/duyệt, tham chiếu ảnh và mã lệnh/mã hàng/tên hàng/số lô, có phân trang. Hỏi hôm nay dùng today=true; hoặc date_from/date_to dạng YYYY-MM-DD, bao gồm cả ngày cuối theo múi giờ Việt Nam, lọc ngày tạo phiếu created_at. item_code, lot_no và production_order_id lọc chính xác; query tìm trong nội dung/nguyên nhân/phương án/kết quả xử lý. approval_status=approved/pending dựa trên có/chưa có người duyệt, không kết luận đã xử lý xong. Không truyền ngày nghĩa là toàn bộ thời gian. Loại phiếu/ảnh đã xóa. Count cần quyền production-order-deviations.list; list cần thêm production-order-deviations.read.',
        inputSchema: deviationSearchSchema,
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'search_production_order_deviations',
          auth,
          PRODUCTION_ORDER_DEVIATION_PERMISSIONS.LIST,
          () => {
            if (
              input.mode === 'list' &&
              !stringArray(auth?.extra?.permissions).includes(
                PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
              )
            ) {
              throw new ForbiddenException(
                'Bạn không có quyền đọc chi tiết sai lệch.',
              );
            }
            return this.tools.searchProductionOrderDeviations(input);
          },
        ),
    );

    server.registerTool(
      'search_mixing_records',
      {
        description:
          'Tìm phiếu pha chế/gia công trên nhiều lô, chỉ trả thông tin nhận diện và duyệt, không tải cấu trúc/kết quả. Lọc chính xác item_code, production_order_code (mã lệnh), lot_no, production_order_id, record_type, created_by_id; query tìm gần đúng mô tả/mã lệnh/mã hàng/tên hàng/số lô. parameter_name tìm phiếu có thông số chứa tên này (ví dụ pH). qa_status/ipc_status=approved|pending dựa trên có/chưa có người duyệt. date_from/date_to dạng YYYY-MM-DD bao gồm cả ngày cuối theo ngày Việt Nam, lọc created_at của phiếu. Không truyền record_type lấy mọi loại; phiếu pha chế là mixing. Có phân trang. Dùng ID kết quả để gọi get_mixing_records.',
        inputSchema: mixingSearchSchema,
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'search_mixing_records',
          auth,
          'production-orders.read',
          () => this.tools.searchMixingRecords(input),
        ),
    );

    server.registerTool(
      'get_mixing_records',
      {
        description:
          'Đọc nhiều phiếu pha chế/gia công đã lưu theo ids từ search_mixing_records hoặc get_production_order, tối đa 10 ID khác nhau mỗi lần. view=full mặc định trả toàn bộ giai đoạn/bước/thông số, yêu cầu/kết quả/ghi chú, tham chiếu ảnh, người/thời gian ghi nhận và duyệt QA/IPC; không dựng lại từ mẫu hiện tại. view=results trả thông tin phiếu và danh sách thông số đã có kết quả/ảnh/ghi chú, bỏ các thông số trống để so sánh gọn hơn. Trả theo thứ tự ids, missing_ids liệt kê phiếu không tồn tại. Không tải ảnh/tệp. Có nhiều hơn 10 phiếu thì gọi theo từng nhóm.',
        inputSchema: mixingReadSchema,
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'get_mixing_records',
          auth,
          'production-orders.read',
          () => this.tools.getMixingRecords(input),
        ),
    );

    server.registerTool(
      'analyze_production_parameters',
      {
        description:
          'Thống kê thông số số học trên nhiều lô bằng database: pH, độ cứng, độ dày, thể tích, tỷ trọng, môi trường, tiệt trùng/lọc hoặc thông số phiếu pha chế. Chọn source; parameter là khóa chỉ tiêu nguồn cố định, hoặc tên thông số chính xác ở mixing_records. Trả số lô, phiếu, ô kết quả, số phép đo hợp lệ/trống/sai định dạng/khác kiểu số; min/max/trung bình/độ lệch chuẩn tổng thể. Luôn tách mã hàng, đơn vị (phân biệt hoa thường), công đoạn và phiên bản; không quy đổi đơn vị hay kết luận đạt. group_by=production_order kèm ID/mã lệnh/số lô; day/month dùng date_field theo giờ Việt Nam. date_field mặc định start_date, có creation_date/recorded_at; mixing recorded_at dùng ngày nhập kết quả, thiếu thì ngày tạo phiếu. Trung bình theo từng phép đo, không phải trung bình đều các lô. Mặc định 30 ngày gần nhất và bỏ lô hủy; today=true hoặc date_from/date_to tối đa 366 ngày; all_time=true cho toàn bộ. Chỉ đọc tổng hợp, không trả nội dung phiếu. Nhóm kết quả có phân trang, tối đa 100/trang; không cộng số lô giữa nhóm vì một lô có thể thuộc nhiều nhóm. Yêu cầu quyền list/read lệnh và quyền riêng của nguồn.',
        inputSchema: parameterAnalysisSchema,
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'analyze_production_parameters',
          auth,
          'production-orders.read',
          () =>
            this.tools.analyzeProductionParameters(
              input,
              stringArray(auth?.extra?.permissions),
            ),
        ),
    );
    server.registerTool(
      'get_production_statistics',
      {
        description:
          'Tổng hợp nhiều lô trực tiếp tại database. metrics chọn tối đa 4 nhóm: orders (số lô/trạng thái), pyclm (tình trạng phiếu mới nhất/tỷ lệ gửi), document_control (cấp/nhận hồ sơ giấy, kiểm nghiệm, phiếu kho), deviations (số sai lệch/duyệt), finished_output (sản lượng hộp từ tổng kết thành phẩm), semi_finished_quantities (nhập/nạp/đóng/tồn/hao hụt theo công đoạn và đơn vị), packaging_pending (lượng chờ xử lý/chờ hủy, không phải đã hủy), vial_defects (số bản ghi và lỗi soi lọ, không phải tỷ lệ lỗi trên tổng sản lượng). group_by none/day/month/item_code/status/warehouse. Sản lượng luôn tách đơn vị; thành phẩm là mã TP; tỷ lệ hoàn thành chỉ so các lô có sản lượng và kế hoạch dương tính bằng hộp. Ngày mặc định start_date như báo cáo frontend, có thể chọn creation_date; mọi bản ghi con tính theo ngày của lệnh, không theo ngày tạo phiếu. Mặc định 30 ngày gần nhất và loại lô hủy; today hoặc khoảng date_from/date_to tối đa 366 ngày, all_time=true cho toàn bộ. matched_orders là số lô khớp bộ lọc; mỗi report có phân trang riêng theo cùng page/limit và các chiều đơn vị/công đoạn/loại lượng. Không tải nội dung phiếu; kiểm tra pagination khi cần hết các nhóm. Cần quyền list/read lệnh và quyền đọc riêng nhóm sai lệch/đóng gói.',
        inputSchema: productionStatisticsSchema,
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'get_production_statistics',
          auth,
          'production-orders.read',
          () =>
            this.tools.getProductionStatistics(
              input,
              stringArray(auth?.extra?.permissions),
            ),
        ),
    );

    return server;
  }

  private result(data: object): CallToolResult {
    const text = JSON.stringify(data);
    return {
      content: [{ type: 'text', text }],
      structuredContent: JSON.parse(text) as Record<string, unknown>,
    };
  }

  private async executeTool(
    name: string,
    auth: AuthInfo | undefined,
    permission: string | undefined,
    operation: () => Promise<object>,
  ) {
    const result = await this.execute(async () => {
      if (
        !auth?.scopes.includes('mcp:read') ||
        (permission &&
          !stringArray(auth.extra?.permissions).includes(permission))
      ) {
        throw new ForbiddenException('Bạn không có quyền sử dụng tool này.');
      }
      return operation();
    });
    this.logger.log(
      JSON.stringify({
        event: 'mcp_tool',
        tool: name,
        user_id: auth?.extra?.userId,
        client_id: auth?.clientId,
        success: !result.isError,
      }),
    );
    return result;
  }

  private async execute(
    operation: () => Promise<object>,
  ): Promise<CallToolResult> {
    try {
      return this.result(await operation());
    } catch (error) {
      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof ForbiddenException)
      ) {
        this.logger.error(error instanceof Error ? error.stack : String(error));
      }
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              error instanceof NotFoundException ||
              error instanceof ForbiddenException
                ? error.message
                : 'Không thể truy vấn dữ liệu lúc này. Vui lòng thử lại sau.',
          },
        ],
      };
    }
  }
}
