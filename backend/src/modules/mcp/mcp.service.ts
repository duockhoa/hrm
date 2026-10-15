import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as z from 'zod/v4';
import { McpToolsService } from './mcp-tools.service';

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
  private readonly handler = createMcpHandler(() => this.createServer());
  private readonly nodeHandler = toNodeHandler(this.handler);

  constructor(private readonly tools: McpToolsService) {}

  handleRequest(request: Request, response: Response) {
    // Nest/Express has already parsed JSON; do not read the request stream again.
    return this.nodeHandler(request, response, request.body);
  }

  async onModuleDestroy() {
    await this.handler.close();
  }

  private createServer() {
    const server = new McpServer(this.serverInfo, {
      instructions:
        'Tra cứu dữ liệu EBR. Dùng search_production_orders để tìm ID lệnh trước khi gọi get_production_order hoặc get_production_order_mixing_records. Khi người dùng hỏi phiếu pha chế, giai đoạn pha chế hoặc kết quả thông số pha chế, gọi get_production_order_mixing_records. Các danh sách có phân trang. Các tool hiện chỉ đọc dữ liệu.',
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
        this.result({
          name: this.serverInfo.name,
          version: this.serverInfo.version,
          authentication: 'none',
          read_only: true,
        }),
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
      (input) => this.execute(() => this.tools.searchProductionOrders(input)),
    );

    server.registerTool(
      'get_production_order',
      {
        description:
          'Xem thông tin chính của một lệnh sản xuất bằng ID lấy từ search_production_orders.',
        inputSchema: z
          .object({ id: z.number().int().positive().max(2147483647) })
          .strict(),
        annotations: readOnlyAnnotations,
      },
      ({ id }) => this.execute(() => this.tools.getProductionOrder(id)),
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
        this.execute(() => this.tools.getProductionOrderMixingRecords(input)),
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

  private async execute(
    operation: () => Promise<object>,
  ): Promise<CallToolResult> {
    try {
      return this.result(await operation());
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        this.logger.error(error instanceof Error ? error.stack : String(error));
      }
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              error instanceof NotFoundException
                ? error.message
                : 'Không thể truy vấn dữ liệu lúc này. Vui lòng thử lại sau.',
          },
        ],
      };
    }
  }
}
