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
    const server = new McpServer(
      { name: 'hrm-ebr-mcp', version: '1.0.0' },
      {
        instructions:
          'Tra cứu dữ liệu EBR. Dùng search_production_orders để tìm ID trước khi gọi get_production_order. Kết quả tìm kiếm có phân trang. Các tool hiện chỉ đọc dữ liệu.',
      },
    );

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
          name: 'hrm-ebr-mcp',
          version: '1.0.0',
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
