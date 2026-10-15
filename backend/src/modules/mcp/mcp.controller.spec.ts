import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { PrismaService } from '../../prisma.service';
import { McpModule } from './mcp.module';
import { mixingRecordsReportInclude } from '../production-orders/exports/mixing-records-report-html';

interface RpcEnvelope {
  id: number;
  result: {
    serverInfo: {
      name: string;
      title: string;
      icons: { src: string; mimeType: string }[];
    };
    capabilities: { tools: unknown };
    tools: { name: string; annotations: { readOnlyHint: boolean } }[];
    structuredContent: Record<string, unknown>;
    isError?: boolean;
    content: { text: string }[];
  };
}

function body(response: request.Response): RpcEnvelope {
  // Legacy clients get an SSE result even without a long-lived session.
  const text =
    response.type === 'text/event-stream'
      ? response.text
          .split('\n')
          .find((line) => line.startsWith('data: '))
          ?.slice(6)
      : response.text;
  if (!text) throw new Error('Missing MCP response');
  return JSON.parse(text) as RpcEnvelope;
}

describe('MCP Streamable HTTP endpoint', () => {
  let app: INestApplication;
  const prisma = {
    productionOrders: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    productionOrderMixingRecords: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.productionOrders.count.mockResolvedValue(0);
    prisma.productionOrders.findMany.mockResolvedValue([]);
    prisma.productionOrders.findUnique.mockResolvedValue(null);
    prisma.productionOrderMixingRecords.count.mockResolvedValue(0);
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  function rpc(method: string, params?: object, id = 1) {
    return request(app.getHttpServer() as Server)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });
  }

  it('initializes a legacy remote client without credentials or a session', async () => {
    const response = await rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    }).expect(200);
    const serverInfo = body(response).result.serverInfo;
    expect(serverInfo.name).toBe('DKPHARMA APP');
    expect(serverInfo.title).toBe('DKPHARMA APP');
    expect(serverInfo.icons).toEqual([
      {
        src: expect.stringMatching(/^data:image\/png;base64,/),
        mimeType: 'image/png',
      },
    ]);
    const iconBytes = Buffer.from(
      serverInfo.icons[0].src.split(',')[1],
      'base64',
    );
    expect(iconBytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(body(response).result.capabilities.tools).toBeDefined();
    expect(response.headers['mcp-session-id']).toBeUndefined();
  });

  it('lists the four read-only tools', async () => {
    const response = await rpc('tools/list').expect(200);
    expect(body(response).result.tools.map((tool) => tool.name)).toEqual([
      'get_server_info',
      'search_production_orders',
      'get_production_order',
      'get_production_order_mixing_records',
    ]);
    expect(
      body(response).result.tools.every(
        (tool: { annotations: { readOnlyHint: boolean } }) =>
          tool.annotations.readOnlyHint,
      ),
    ).toBe(true);
  });

  it('calls the connectivity tool without using the database', async () => {
    const response = await rpc('tools/call', {
      name: 'get_server_info',
      arguments: {},
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      name: 'DKPHARMA APP',
      authentication: 'none',
      read_only: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('acknowledges the initialized notification', async () => {
    await request(app.getHttpServer() as Server)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      .expect(202);
  });

  it('rejects unsupported legacy session operations', async () => {
    await request(app.getHttpServer() as Server)
      .get('/mcp')
      .set('Accept', 'text/event-stream')
      .expect(405);
    await request(app.getHttpServer() as Server)
      .delete('/mcp')
      .expect(405);
  });

  it('rejects an invalid order ID before querying the database', async () => {
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: -1 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('applies filters and pagination in the database query', async () => {
    prisma.productionOrders.count.mockResolvedValue(45);
    prisma.productionOrders.findMany.mockResolvedValue([{ id: 7 }]);
    const response = await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: { query: ' TP ', item_code: 'TP001', page: 2, limit: 20 },
    }).expect(200);
    expect(prisma.productionOrders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          item_code: 'TP001',
          OR: expect.arrayContaining([{ lot_no: { contains: 'TP' } }]),
        }),
        skip: 20,
        take: 20,
      }),
    );
    expect(body(response).result.structuredContent.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      total_pages: 3,
      has_next_page: true,
    });
  });

  it('rejects an oversized page before querying the database', async () => {
    const response = await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: { limit: 101 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('serializes dates in an order result as ISO strings', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      creation_date: new Date('2026-10-15T00:00:00Z'),
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toEqual({
      id: 7,
      creation_date: '2026-10-15T00:00:00.000Z',
    });
  });

  it('reports a missing order as a tool error', async () => {
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 999 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(body(response).result.content[0].text).toContain('999');
  });

  it('returns a tool error without exposing database error details', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      prisma.productionOrders.findUnique.mockRejectedValue(
        new Error('private database details'),
      );
      const response = await rpc('tools/call', {
        name: 'get_production_order',
        arguments: { id: 7 },
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(JSON.stringify(body(response))).not.toContain(
        'private database details',
      );
    } finally {
      log.mockRestore();
    }
  });

  it('handles independent concurrent requests without session initialization', async () => {
    const responses = await Promise.all([
      rpc('ping', {}, 11),
      rpc('ping', {}, 12),
    ]);
    expect(responses.map((response) => body(response).id)).toEqual([11, 12]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
  });

  it('returns saved mixing record details and applies order/type filters and pagination', async () => {
    const order = { id: 7, lot_no: 'LOT007' };
    const record = {
      id: 12,
      record_type: 'mixing',
      qa_staff_approved_at: new Date('2026-10-15T00:00:00Z'),
      qaStaffApprovedBy: { name: 'QA', username: 'qa' },
      stages: [
        {
          stage_order: 1,
          stage_name: 'Pha chế',
          steps: [
            {
              step_order: 1,
              step_name: 'Khuấy',
              parameters: [
                {
                  parameter_order: 1,
                  parameter_name: 'Thời gian',
                  requirement: '10 phút',
                  result_value: '10',
                  unit: 'phút',
                  recordedBy: { name: 'Người ghi', username: 'operator' },
                },
              ],
            },
          ],
        },
      ],
    };
    prisma.productionOrders.findUnique.mockResolvedValue(order);
    prisma.productionOrderMixingRecords.count.mockResolvedValue(3);
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([record]);
    const response = await rpc('tools/call', {
      name: 'get_production_order_mixing_records',
      arguments: { production_order_id: 7, page: 2, limit: 1 },
    }).expect(200);
    expect(prisma.productionOrderMixingRecords.findMany).toHaveBeenCalledWith({
      where: { production_order_id: 7, record_type: 'mixing' },
      include: mixingRecordsReportInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: 1,
      take: 1,
    });
    expect(body(response).result.structuredContent).toEqual({
      production_order: order,
      data: [{ ...record, qa_staff_approved_at: '2026-10-15T00:00:00.000Z' }],
      pagination: {
        page: 2,
        limit: 1,
        total: 3,
        total_pages: 3,
        has_next_page: true,
      },
    });
  });

  it('reports an existing order without mixing records as an empty result', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    const response = await rpc('tools/call', {
      name: 'get_production_order_mixing_records',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [],
      message: 'Lệnh sản xuất chưa có phiếu pha chế.',
      pagination: { page: 1, limit: 5, total: 0, has_next_page: false },
    });
  });

  it('does not query mixing records when the production order does not exist', async () => {
    const response = await rpc('tools/call', {
      name: 'get_production_order_mixing_records',
      arguments: { production_order_id: 999 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrderMixingRecords.findMany).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { production_order_id: -1 },
    { production_order_id: 7, limit: 21 },
    { production_order_id: 7, page: 0 },
  ])(
    'validates mixing record arguments before querying the database: %j',
    async (arguments_) => {
      const response = await rpc('tools/call', {
        name: 'get_production_order_mixing_records',
        arguments: arguments_,
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
      expect(
        prisma.productionOrderMixingRecords.findMany,
      ).not.toHaveBeenCalled();
    },
  );
});
