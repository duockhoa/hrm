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
        'Tra cứu dữ liệu EBR. Dùng search_production_orders để tìm ID lệnh theo mã lệnh, sản phẩm hoặc số lô, có phân trang. Sau đó gọi get_production_order với id để lấy toàn bộ hồ sơ lô từ dữ liệu cục bộ. Các nhóm nằm trong sections, không cắt bớt bản ghi. Dùng search_items tìm mã/tên sản phẩm, rồi get_item theo item_code để xem cấu hình sản phẩm hiện tại. Cấu hình hiện tại có thể khác cấu hình đã lưu theo lô; không tự áp dụng cho lô cũ. Nhóm thiếu quyền đọc có available=false, không được kết luận là không có dữ liệu. Mức độ có dữ liệu khác với đạt chất lượng và phê duyệt. Chỉ đọc dữ liệu; ảnh/tệp trả tham chiếu, không tải nội dung.',
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
          'Lấy toàn bộ hồ sơ lô/lệnh sản xuất theo id từ search_production_orders: thông tin chung, số đăng ký, PYCLM và toàn bộ lịch sử lấy mẫu, cấp/nhận hồ sơ, hướng dẫn sản xuất, checklist; toàn bộ phiếu pha chế/gia công đã lưu, sai lệch, kiểm tra/tiệt trùng/lọc, đóng gói, tổng kết sản lượng/hao hụt, xét duyệt xuất xưởng và tài liệu đính kèm. Các bảng chi tiết nằm trong sections với available, total và data; không phân trang và không giới hạn số bản ghi. Kiểm tra quyền đọc từng nhóm, loại bỏ sai lệch/ảnh đã xóa. Chỉ trả metadata/tham chiếu ảnh và tệp. null hoặc dữ liệu rỗng không đồng nghĩa đạt chất lượng hay đã phê duyệt.',
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
