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
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from '../production-order-deviations/production-order-deviations.permissions';
import { recordTools } from './mcp-record-sections';

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
        'Tra cứu dữ liệu EBR. Dùng search_production_orders để tìm ID lệnh trước khi gọi các tool theo lệnh sản xuất. Dùng get_production_order xem tổng quan hồ sơ, sản lượng, xét duyệt và sai lệch gần nhất. Khi hỏi pha chế, gọi get_production_order_mixing_records. Khi hỏi sai lệch, nguyên nhân hoặc xử lý, gọi get_production_order_deviations. Các bảng khác dùng tool summaries, checks, packaging, sampling, attachments hoặc factory_release_reviews tương ứng. Các danh sách có phân trang; cần gọi trang tiếp theo nếu chưa đủ dữ liệu, không kết luận toàn bộ lô từ một trang. Mức độ có dữ liệu khác với đạt chất lượng và phê duyệt. Các tool hiện chỉ đọc dữ liệu cục bộ.',
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
          'Tìm lệnh sản xuất theo mã lệnh, mã/tên sản phẩm hoặc số lô. item_code, lot_no và status lọc chính xác. Dùng page để lấy trang tiếp theo.',
        inputSchema: z
          .object({
            query: z.string().trim().min(1).max(100).optional(),
            item_code: z.string().trim().min(1).max(100).optional(),
            lot_no: z.string().trim().min(1).max(100).optional(),
            status: z.string().trim().min(1).max(100).optional(),
            page: z.number().int().min(1).max(1000000).default(1),
            limit: z.number().int().min(1).max(100).default(20),
          })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'search_production_orders',
          auth,
          'production-orders.list',
          () => this.tools.searchProductionOrders(input),
        ),
    );

    server.registerTool(
      'get_production_order',
      {
        description:
          'Xem chi tiết lô/lệnh sản xuất bằng ID lấy từ search_production_orders: thông tin sản phẩm, số lô, trạng thái, số lượng kế hoạch, các ngày, nguồn gốc, kho, mô tả, quy cách đóng gói, ghi chú, nội dung thay đổi và số đăng ký. Kèm PYCLM mới nhất, các mốc cấp/nhận hồ sơ và người thực hiện, metadata hướng dẫn sản xuất, mức độ đầy đủ hồ sơ, số bản ghi và tổng kết sản lượng/xét duyệt mới nhất, tối đa 3 sai lệch gần nhất nếu có quyền đọc sai lệch. null là chưa có dữ liệu, không phải kết luận đạt hay đã duyệt. Các bản tổng kết mới nhất không đại diện toàn bộ công đoạn; cần dùng tool chi tiết và phân trang để xem đầy đủ.',
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
      'get_production_order_mixing_records',
      {
        description:
          'Lấy thông tin phiếu pha chế (mixing records) đã lưu của một lệnh sản xuất: giai đoạn, bước thực hiện, yêu cầu, kết quả thông số, đơn vị, ghi chú, người ghi nhận và thông tin duyệt QA/IPC. Dùng khi người dùng hỏi phiếu pha chế hoặc quá trình pha chế của một lô. Tìm production_order_id bằng search_production_orders trước nếu chưa biết ID. Chỉ lấy loại mixing; không lấy phiếu gia công đóng gói sơ cấp. Kết quả có phân trang.',
        inputSchema: z
          .object({
            production_order_id: z
              .number()
              .int()
              .positive()
              .max(2147483647)
              .describe(
                'ID lệnh sản xuất, lấy từ trường id của search_production_orders.',
              ),
            page: z.number().int().min(1).max(1000000).default(1),
            limit: z.number().int().min(1).max(20).default(5),
          })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'get_production_order_mixing_records',
          auth,
          'production-orders.read',
          () => this.tools.getProductionOrderMixingRecords(input),
        ),
    );

    server.registerTool(
      'get_production_order_deviations',
      {
        description:
          'Lấy thông tin sai lệch đã lưu của một lệnh sản xuất: nội dung, nguyên nhân và phân loại, phương án/kết quả xử lý, số lượng ảnh hưởng/đã xử lý/tiêu hủy và đơn vị, người báo cáo/phê duyệt, thời gian và tham chiếu ảnh. Tìm production_order_id bằng search_production_orders theo mã lệnh hoặc số lô trước nếu chưa biết ID. deviation_id tùy chọn để lấy một phiếu cụ thể trong lệnh. Bỏ qua sai lệch và ảnh đã xóa. Kết quả có phân trang; ảnh không được tải về.',
        inputSchema: z
          .object({
            production_order_id: z
              .number()
              .int()
              .positive()
              .max(2147483647)
              .describe('ID lệnh sản xuất lấy từ search_production_orders.'),
            deviation_id: z
              .number()
              .int()
              .positive()
              .max(2147483647)
              .optional()
              .describe(
                'ID sai lệch thuộc lệnh sản xuất, bỏ trống để lấy danh sách.',
              ),
            approval_status: z
              .enum(['approved', 'pending'])
              .optional()
              .describe(
                'Lọc theo việc đã có người phê duyệt; không đồng nghĩa đã xử lý xong sai lệch.',
              ),
            query: z
              .string()
              .trim()
              .min(1)
              .max(100)
              .optional()
              .describe(
                'Tìm trong nội dung, nguyên nhân, phương án hoặc kết quả xử lý.',
              ),
            page: z.number().int().min(1).max(1000000).default(1),
            limit: z.number().int().min(1).max(20).default(10),
          })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      (input) =>
        this.executeTool(
          'get_production_order_deviations',
          auth,
          PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
          () => this.tools.getProductionOrderDeviations(input),
        ),
    );

    server.registerTool(
      'get_production_order_completeness',
      {
        description:
          'Kiểm tra mức độ đầy đủ hồ sơ lô theo cấu hình áp dụng, chỉ dùng dữ liệu cục bộ: mục bắt buộc, đã có dữ liệu, còn thiếu và không kiểm tra được. has_data không có nghĩa đạt chất lượng hoặc đã phê duyệt. Mục phụ thuộc nguồn dữ liệu ngoài phạm vi được trả là unavailable, không phải missing.',
        inputSchema: z
          .object({
            production_order_id: z.number().int().positive().max(2147483647),
          })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      ({ production_order_id }) =>
        this.executeTool(
          'get_production_order_completeness',
          auth,
          'production-orders.read',
          () => this.tools.getProductionOrderCompleteness(production_order_id),
        ),
    );

    for (const definition of recordTools) {
      server.registerTool(
        definition.name,
        {
          description: `${definition.description} Tìm production_order_id bằng search_production_orders. Kết quả có phân trang; record_id tùy chọn để lấy một bản ghi. from/to là thời gian ISO 8601 có múi giờ, lọc theo thời gian nghiệp vụ của phiếu nếu có, nếu không theo ngày tạo.`,
          inputSchema: z
            .object({
              production_order_id: z.number().int().positive().max(2147483647),
              section: z.enum(definition.sections),
              record_id: z.number().int().positive().max(2147483647).optional(),
              from: z.iso.datetime({ offset: true }).optional(),
              to: z.iso.datetime({ offset: true }).optional(),
              page: z.number().int().min(1).max(1000000).default(1),
              limit: z.number().int().min(1).max(20).default(5),
            })
            .strict()
            .refine(
              (input) =>
                !input.from ||
                !input.to ||
                Date.parse(input.from) <= Date.parse(input.to),
              {
                message: 'from phải nhỏ hơn hoặc bằng to.',
              },
            ),
          annotations: readOnlyAnnotations,
        },
        (input) =>
          this.executeTool(
            definition.name,
            auth,
            'production-orders.read',
            () =>
              this.tools.getProductionOrderRecords(
                input,
                stringArray(auth?.extra?.permissions),
              ),
          ),
      );
    }

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
