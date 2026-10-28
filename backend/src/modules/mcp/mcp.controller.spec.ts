import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { PrismaService } from '../../prisma.service';
import { McpModule } from './mcp.module';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';
import { OAuthService } from '../mcp-oauth/oauth.service';
import { Prisma } from '@prisma/client';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';
import { recordSections } from './mcp-record-sections';
import { AuthenticationMiddleware } from '../../middleware/authentication/authentication.middleware';
import {
  buildOrderSearch,
  orderSearchSchema,
  orderSearchMetadataQuery,
} from './mcp-order-search';

const accessToken = `mcp_at_${'A'.repeat(43)}`;
const authenticated = () => ({
  auth: {
    token: accessToken,
    clientId: 'test-client',
    scopes: ['mcp:read'],
    expiresAt: Math.floor(Date.now() / 1000) + 900,
    extra: {
      userId: 1,
      permissions: [
        'production-orders.list',
        'production-orders.read',
        'production-order-deviations.read',
      ],
    },
  },
  user: {
    id: 1,
    name: 'Test',
    username: 'test',
    permissions: ['production-orders.list', 'production-orders.read'],
  },
});

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
  const oauth = {
    config: {
      metadataUrl:
        'http://localhost:3012/.well-known/oauth-protected-resource/mcp',
      allowedOrigins: ['http://localhost:3012', 'https://gemini.google.com'],
    },
    resolveMcpToken: jest.fn(),
  };
  const prisma = {
    userRoles: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
    productionOrderMixingRecords: { count: jest.fn(), findMany: jest.fn() },
    productionOrderWeighingRecords: { count: jest.fn(), findMany: jest.fn() },
    productionOrderDeviations: { count: jest.fn(), findMany: jest.fn() },
    items: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    features: { findMany: jest.fn() },
    productionOrders: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const completeness = { findByProductionOrder: jest.fn() };
  const sap = {
    getProductionOrderById: jest.fn(),
    getUnitOfMeasurements: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(SapB1ServiceLayerClient)
      .useValue(sap)
      .overrideProvider(OAuthService)
      .useValue(oauth)
      .overrideProvider(ProductionOrderLocalCompletenessService)
      .useValue(completeness)
      .compile();
    app = module.createNestApplication();
    const middleware = new AuthenticationMiddleware();
    app.use(middleware.use.bind(middleware));
    app.useLogger(false);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sap.getProductionOrderById.mockReset();
    sap.getUnitOfMeasurements.mockReset();
    prisma.userRoles.findMany.mockResolvedValue([
      { roles: { production_order_read_limit: null } },
    ]);
    prisma.$queryRaw.mockReset();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.productionOrderMixingRecords.count.mockResolvedValue(0);
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([]);
    prisma.productionOrderWeighingRecords.count.mockResolvedValue(0);
    prisma.productionOrderWeighingRecords.findMany.mockResolvedValue([]);
    prisma.productionOrderDeviations.count.mockResolvedValue(0);
    prisma.productionOrderDeviations.findMany.mockResolvedValue([]);
    prisma.items.count.mockResolvedValue(0);
    prisma.items.findMany.mockResolvedValue([]);
    prisma.items.findFirst.mockResolvedValue(null);
    prisma.features.findMany.mockResolvedValue([]);
    oauth.resolveMcpToken.mockResolvedValue(authenticated());
    prisma.productionOrders.count.mockResolvedValue(0);
    prisma.productionOrders.findMany.mockResolvedValue([]);
    prisma.productionOrders.findUnique.mockResolvedValue(null);
    completeness.findByProductionOrder.mockResolvedValue({
      production_order_id: 7,
      required_count: 0,
      completed_count: 0,
      is_complete: true,
      required_sections: [],
      missing_sections: [],
      unavailable_sections: [],
    });
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
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });
  }

  it('limits all-time statistics to the current role scope before aggregation', async () => {
    prisma.userRoles.findMany.mockResolvedValue([
      { roles: { production_order_read_limit: 300 } },
    ]);
    prisma.productionOrders.findMany.mockResolvedValue([
      { id: 301 },
      { id: 300 },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ matched_orders: 2n }])
      .mockResolvedValueOnce([]);
    const response = await rpc('tools/call', {
      name: 'get_production_statistics',
      arguments: { all_time: true, metrics: ['orders'] },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent).toMatchObject({
      data_scope: { production_order_read_limit: 300, visible_order_count: 2 },
    });
    for (const [query] of prisma.$queryRaw.mock.calls as [Prisma.Sql][]) {
      expect(query.sql).toContain('p.id IN (?,?)');
      expect(query.values).toEqual(expect.arrayContaining([301, 300]));
    }
    expect(prisma.userRoles.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.productionOrders.findMany).toHaveBeenCalledWith({
      select: { id: true },
      orderBy: [{ creation_date: 'desc' }, { id: 'desc' }],
      take: 300,
    });
  });

  it('limits SQL order search counts and pages to the same visible orders', async () => {
    prisma.userRoles.findMany.mockResolvedValue([
      { roles: { production_order_read_limit: 300 } },
    ]);
    prisma.productionOrders.findMany.mockResolvedValue([
      { id: 301 },
      { id: 300 },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 0n }])
      .mockResolvedValueOnce([]);
    await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: { pyclm_sent: false },
    }).expect(200);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    for (const [query] of prisma.$queryRaw.mock.calls as [Prisma.Sql][]) {
      expect(query.sql).toContain('p.id IN (?,?)');
      expect(query.values).toEqual(expect.arrayContaining([301, 300]));
    }
  });

  it('initializes a legacy remote client with OAuth and without a session', async () => {
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

  it('calls the connectivity tool without using the database', async () => {
    const response = await rpc('tools/call', {
      name: 'get_server_info',
      arguments: {},
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      name: 'DKPHARMA APP',
      authentication: 'oauth2',
      read_only: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('acknowledges the initialized notification', async () => {
    await request(app.getHttpServer() as Server)
      .post('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      .expect(202);
  });

  it('rejects unsupported legacy session operations', async () => {
    await request(app.getHttpServer() as Server)
      .get('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'text/event-stream')
      .expect(405);
    await request(app.getHttpServer() as Server)
      .delete('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
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
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('filters document milestones before pagination and loads metadata/counts in one query for only page IDs', async () => {
    const input = {
      batch_record_received: true,
      test_certificate_received: false,
      presence: { date_checks: true },
      counts: ['date_checks'],
      page: 2,
      limit: 20,
    };
    const identity = authenticated();
    identity.auth.extra.permissions.push('production-orders.date-checks.read');
    oauth.resolveMcpToken.mockResolvedValue(identity);
    prisma.productionOrders.count.mockResolvedValue(22);
    prisma.productionOrders.findMany.mockResolvedValue([
      { id: 7, lot_no: 'LOT1' },
    ]);
    const plan = buildOrderSearch(
      orderSearchSchema.parse(input),
      identity.auth.extra.permissions,
    );
    const metadata = orderSearchMetadataQuery(plan, [7]);
    const values: Record<string, unknown> = { id: 7 };
    for (const column of metadata.columns)
      values[column.alias] =
        column.kind === 'boolean' ? 1 : column.kind === 'number' ? 3n : null;
    prisma.$queryRaw.mockResolvedValueOnce([values]);
    const response = await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: input,
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [
        {
          id: 7,
          search_info: {
            document_control: { batch_record_received: true },
            date_checks: { has_data: true },
            counts: { date_checks: 3 },
          },
        },
      ],
      pagination: { total: 22, page: 2, total_pages: 2 },
    });
    expect(prisma.productionOrders.count).toHaveBeenCalledWith({
      where: plan.where,
    });
    expect(prisma.productionOrders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: plan.where, skip: 20, take: 20 }),
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [query] = prisma.$queryRaw.mock.calls[0] as [Prisma.Sql];
    expect(query.values.slice(-1)).toEqual([7]);
    expect(query.sql).not.toContain('result_value');
    expect(completeness.findByProductionOrder).not.toHaveBeenCalled();
  });

  it('filters latest PYCLM in SQL before count/LIMIT and hydrates only the matching page', async () => {
    const input = {
      pyclm_sent: false,
      item_code: 'TP001',
      batch_record_received: false,
      page: 2,
      limit: 1,
    };
    const permissions = authenticated().auth.extra.permissions;
    const metadata = orderSearchMetadataQuery(
      buildOrderSearch(orderSearchSchema.parse(input), permissions),
      [7],
    );
    const values: Record<string, unknown> = { id: 7 };
    for (const column of metadata.columns)
      values[column.alias] = column.kind === 'boolean' ? 0 : null;
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 3n }])
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([values]);
    prisma.productionOrders.findMany.mockResolvedValue([{ id: 7 }]);
    const response = await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: input,
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [{ id: 7, search_info: { pyclm: { sent: false } } }],
      pagination: { total: 3, page: 2, limit: 1 },
    });
    expect(prisma.productionOrders.count).not.toHaveBeenCalled();
    expect(prisma.productionOrders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [7] } } }),
    );
    const [countQuery] = prisma.$queryRaw.mock.calls[0] as [Prisma.Sql];
    const [pageQuery] = prisma.$queryRaw.mock.calls[1] as [Prisma.Sql];
    expect(countQuery.sql).toContain('COUNT(*)');
    expect(countQuery.sql).toContain("sr.status<>'sent'");
    expect(pageQuery.sql).toContain('LIMIT ? OFFSET ?');
    expect(pageQuery.values.slice(-2)).toEqual([1, 1]);
  });

  it('does not query metadata for an empty page', async () => {
    const response = await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: { include: ['pyclm'] },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({ data: [] });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    { presence: { date_checks: false } },
    { counts: ['steam_sterilization_checks'] },
    { include: ['equipment_monitoring_records'] },
  ])(
    'checks permission before any extended search query: %j',
    async (arguments_) => {
      const response = await rpc('tools/call', {
        name: 'search_production_orders',
        arguments: arguments_,
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.productionOrders.count).not.toHaveBeenCalled();
      expect(prisma.productionOrders.findMany).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    },
  );

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
    expect(body(response).result.structuredContent.data).toMatchObject({
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

  it('handles independent authenticated concurrent requests without session initialization', async () => {
    const responses = await Promise.all([
      rpc('ping', {}, 11),
      rpc('ping', {}, 12),
    ]);
    expect(responses.map((response) => body(response).id)).toEqual([11, 12]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
  });

  it('requires an MCP token and advertises protected-resource metadata', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/mcp')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      .expect(401);
    expect(response.headers['www-authenticate']).toContain(
      'oauth-protected-resource/mcp',
    );
    expect(prisma.productionOrders.findMany).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens and insufficient scopes before handling MCP', async () => {
    oauth.resolveMcpToken.mockResolvedValueOnce(null);
    await rpc('tools/list').expect(401);
    const identity = authenticated();
    identity.auth.scopes = ['offline_access'];
    oauth.resolveMcpToken.mockResolvedValueOnce(identity);
    await rpc('tools/list').expect(403);
  });

  it('checks business permissions before querying a tool', async () => {
    const identity = authenticated();
    identity.auth.extra.permissions = [];
    oauth.resolveMcpToken.mockResolvedValueOnce(identity);
    const response = await rpc('tools/call', {
      name: 'search_production_orders',
      arguments: {},
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrders.findMany).not.toHaveBeenCalled();
  });

  function allowItems(...permissions: string[]) {
    const identity = authenticated();
    identity.auth.extra.permissions = permissions;
    oauth.resolveMcpToken.mockResolvedValue(identity);
  }

  it('searches active items with trimmed filters, normalized prefix and database pagination', async () => {
    allowItems('items.list');
    prisma.items.count.mockResolvedValue(5);
    prisma.items.findMany.mockResolvedValue([
      {
        item_code: 'BTP001',
        item_name: 'Sản phẩm A',
        registration: {
          id: 1,
          registration_number: 'REG1',
          product_name: 'A',
          deleted_at: null,
        },
      },
      {
        item_code: 'BTP002',
        item_name: 'Sản phẩm B',
        registration: { deleted_at: new Date() },
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'search_items',
      arguments: {
        query: ' Sản phẩm ',
        item_code: ' BTP001 ',
        code_prefix: ' btp ',
        page: 2,
        limit: 2,
      },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [
        { item_code: 'BTP001', registration: { registration_number: 'REG1' } },
        { item_code: 'BTP002', registration: null },
      ],
      pagination: {
        page: 2,
        limit: 2,
        total: 5,
        total_pages: 3,
        has_next_page: true,
      },
    });
    const where = {
      deleted_at: null,
      item_code: 'BTP001',
      AND: [{ item_code: { startsWith: 'BTP' } }],
      OR: [
        { item_code: { contains: 'Sản phẩm' } },
        { item_name: { contains: 'Sản phẩm' } },
        { dk_code: { contains: 'Sản phẩm' } },
      ],
    };
    expect(prisma.items.count).toHaveBeenCalledWith({ where });
    expect(prisma.items.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: { item_code: 'asc' },
        skip: 2,
        take: 2,
      }),
    );
    expect(response.text).not.toContain('deleted_at');
  });

  it('returns an empty item search with default pagination', async () => {
    allowItems('items.list');
    const response = await rpc('tools/call', {
      name: 'search_items',
      arguments: {},
    }).expect(200);
    expect(body(response).result.structuredContent).toEqual({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
        has_next_page: false,
      },
    });
  });

  it('returns current item specifications, configuration, equipment and all authorized template versions', async () => {
    allowItems(
      'items.read',
      'mixing-activity-templates.read',
      'date-print-templates.read',
    );
    const date = new Date('2026-10-15T01:00:00Z');
    const user = { id: 2, name: 'QA', username: 'qa' };
    const templates = Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      version: i + 1,
      status: i ? 'active' : 'inactive',
      batch_size: new Prisma.Decimal('123.456'),
      stages: [
        {
          steps: [
            {
              parameters: [
                { parameter_name: 'Thời gian', requirement: '10 phút' },
              ],
            },
          ],
        },
      ],
    }));
    prisma.items.findFirst.mockResolvedValue({
      item_code: 'TP001',
      item_name: 'Sản phẩm A',
      unit: 'hộp',
      dk_code: 'DK001',
      created_at: date,
      update_at: date,
      registration: {
        id: 1,
        registration_number: 'REG1',
        product_name: 'A',
        deleted_at: null,
      },
      productionSpecification: {
        deleted_at: null,
        lower_control_limit: new Prisma.Decimal('1.234567'),
        productLine: { code: 'LINE1', name: 'Dây chuyền 1' },
        dosageForm: { name: 'Viên nén' },
        updatedBy: user,
      },
      itemFeatures: [
        {
          feature_id: 1,
          enabled: true,
          required: true,
          order: null,
          feature: {
            key: 'mixing_records',
            kind: 'section',
            label: 'Pha chế',
            group_name: null,
            default_order: 10,
          },
        },
        {
          feature_id: 2,
          enabled: false,
          required: false,
          order: 5,
          feature: {
            key: 'date_checks',
            kind: 'section',
            label: 'In date',
            group_name: null,
            default_order: 20,
          },
        },
      ],
      itemEquipment: [
        {
          id: 1,
          equipment: {
            code: 'TB001',
            parameters: [{ name: 'Nhiệt độ', unit: '°C' }],
          },
          createdBy: user,
        },
      ],
      mixingActivityTemplates: templates,
      datePrintTemplates: [
        {
          id: 1,
          version: 1,
          print_content: 'Số lô',
          manufacturing_date_format: 'dd/MM/yyyy',
        },
      ],
    });
    prisma.features.findMany.mockResolvedValue([
      {
        id: 1,
        key: 'mixing_records',
        kind: 'section',
        label: 'Pha chế',
        group_name: null,
        default_order: 10,
        sourceActions: [],
      },
      {
        id: 2,
        key: 'date_checks',
        kind: 'section',
        label: 'In date',
        group_name: null,
        default_order: 20,
        sourceActions: [],
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'get_item',
      arguments: { item_code: ' TP001 ' },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent.data).toMatchObject({
      item_code: 'TP001',
      created_at: date.toISOString(),
      configuration_source: 'current_item',
      registration: { registration_number: 'REG1' },
      production_specification: {
        lower_control_limit: '1.234567',
        dosageForm: { name: 'Viên nén' },
        updatedBy: user,
      },
      feature_config: {
        item_code: 'TP001',
        sections: [
          { key: 'date_checks', enabled: false, required: false, order: 5 },
          { key: 'mixing_records', enabled: false, required: false, order: 10 },
        ],
      },
      equipment: {
        available: true,
        total: 1,
        data: [{ equipment: { code: 'TB001' } }],
      },
      mixing_activity_templates: { available: true, total: 24 },
      date_print_templates: { available: true, total: 1 },
    });
    const data = body(response).result.structuredContent.data as {
      mixing_activity_templates: { data: unknown[] };
      production_specification: object;
    };
    expect(data.mixing_activity_templates.data).toHaveLength(24);
    expect(data.production_specification).not.toHaveProperty('deleted_at');
    expect(response.text).not.toContain('default_order');
    const [query] = prisma.items.findFirst.mock.calls[0] as [
      { where: object; select: Record<string, unknown> },
    ];
    expect(query.where).toEqual({ item_code: 'TP001', deleted_at: null });
    expect(query.select.mixingActivityTemplates).not.toHaveProperty('take');
    expect(query.select.mixingActivityTemplates).not.toHaveProperty('where');
    expect(query.select).not.toHaveProperty('productionOrders');
    expect(query.select).not.toHaveProperty('warehouseReceiptItems');
    expect(prisma.productionOrders.findMany).not.toHaveBeenCalled();
  });

  it('omits unauthorized template queries and data while allowing the item to be read', async () => {
    allowItems('items.read');
    prisma.items.findFirst.mockResolvedValue({
      item_code: 'TP001',
      item_name: 'A',
      mixingActivityTemplates: [{ description: 'private mixing template' }],
      datePrintTemplates: [{ print_content: 'private date template' }],
    });
    const response = await rpc('tools/call', {
      name: 'get_item',
      arguments: { item_code: 'TP001' },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      mixing_activity_templates: {
        available: false,
        reason: 'permission_required',
      },
      date_print_templates: { available: false, reason: 'permission_required' },
    });
    expect(response.text).not.toContain('private mixing template');
    expect(response.text).not.toContain('private date template');
    const [query] = prisma.items.findFirst.mock.calls[0] as [
      { select: Record<string, unknown> },
    ];
    expect(query.select).not.toHaveProperty('mixingActivityTemplates');
    expect(query.select).not.toHaveProperty('datePrintTemplates');
  });

  it('hides deleted registration/specifications and returns empty configured groups', async () => {
    allowItems(
      'items.read',
      'mixing-activity-templates.read',
      'date-print-templates.read',
    );
    prisma.items.findFirst.mockResolvedValue({
      item_code: 'TP001',
      registration: { deleted_at: new Date(), registration_number: 'OLD' },
      productionSpecification: { deleted_at: new Date(), hardness_unit: 'OLD' },
    });
    const response = await rpc('tools/call', {
      name: 'get_item',
      arguments: { item_code: 'TP001' },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      registration: null,
      production_specification: null,
      feature_config: { sections: [], actions: [] },
      equipment: { total: 0, data: [] },
      mixing_activity_templates: { available: true, total: 0, data: [] },
    });
    expect(response.text).not.toContain('OLD');
  });

  it('reports an absent or deleted item as a tool error', async () => {
    allowItems('items.read');
    const response = await rpc('tools/call', {
      name: 'get_item',
      arguments: { item_code: 'NO-ITEM' },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(body(response).result.content[0].text).toContain('NO-ITEM');
    expect(prisma.items.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { item_code: 'NO-ITEM', deleted_at: null },
      }),
    );
  });

  it.each([
    ['search_items', {}, ['items.read']],
    [
      'get_item',
      { item_code: 'TP001' },
      ['items.list', 'mixing-activity-templates.read'],
    ],
  ] as [string, object, string[]][])(
    'requires the item permission for %s before querying',
    async (name, arguments_, permissions) => {
      allowItems(...permissions);
      const response = await rpc('tools/call', {
        name,
        arguments: arguments_,
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.items.findFirst).not.toHaveBeenCalled();
      expect(prisma.items.findMany).not.toHaveBeenCalled();
      expect(prisma.items.count).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['get_item', {}],
    ['get_item', { item_code: ' ' }],
    ['get_item', { item_code: 123 }],
    ['search_items', { limit: 101 }],
    ['search_items', { page: 0 }],
    ['search_items', { query: ' ' }],
    ['search_items', { code_prefix: 'TP1' }],
    ['search_items', { unexpected: true }],
  ] as [string, object][])(
    'validates %s arguments: %j',
    async (name, arguments_) => {
      allowItems('items.list', 'items.read');
      const response = await rpc('tools/call', {
        name,
        arguments: arguments_,
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.items.findFirst).not.toHaveBeenCalled();
      expect(prisma.items.findMany).not.toHaveBeenCalled();
    },
  );

  it('sanitizes item database failures', async () => {
    allowItems('items.read');
    prisma.items.findFirst.mockRejectedValueOnce(
      new Error('private item database failure'),
    );
    const response = await rpc('tools/call', {
      name: 'get_item',
      arguments: { item_code: 'TP001' },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(response.text).not.toContain('private item database failure');
  });

  it('searches mixing records by order/product, parameter, dates and QA/IPC without loading results', async () => {
    prisma.productionOrderMixingRecords.count.mockResolvedValue(45);
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([
      {
        id: 11,
        record_type: 'mixing',
        productionOrder: { id: 7, item_code: 'BTP0001', lot_no: 'LOT1' },
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'search_mixing_records',
      arguments: {
        item_code: ' BTP0001 ',
        production_order_code: ' LSX007 ',
        production_order_id: 7,
        lot_no: ' LOT1 ',
        record_type: 'mixing',
        parameter_name: ' pH ',
        query: ' BTP ',
        qa_status: 'approved',
        ipc_status: 'pending',
        created_by_id: 2,
        date_from: '2026-10-01',
        date_to: '2026-10-18',
        page: 2,
        limit: 20,
      },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [{ id: 11 }],
      pagination: { total: 45, page: 2, limit: 20, has_next_page: true },
    });
    const [countArgs] = prisma.productionOrderMixingRecords.count.mock
      .calls[0] as [{ where: object }];
    expect(countArgs.where).toMatchObject({
      production_order_id: 7,
      productionOrder: {
        is: {
          item_code: 'BTP0001',
          production_order_code: 'LSX007',
          lot_no: 'LOT1',
        },
      },
      record_type: 'mixing',
      created_by_id: 2,
      qa_staff_approved_by_id: { not: null },
      ipc_staff_approved_by_id: null,
      created_at: {
        gte: new Date('2026-09-30T17:00:00Z'),
        lt: new Date('2026-10-18T17:00:00Z'),
      },
      stages: {
        some: {
          steps: {
            some: {
              parameters: { some: { parameter_name: { contains: 'pH' } } },
            },
          },
        },
      },
    });
    expect(prisma.productionOrderMixingRecords.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: countArgs.where,
        skip: 20,
        take: 20,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
    const [query] = prisma.productionOrderMixingRecords.findMany.mock
      .calls[0] as [{ select: Record<string, unknown> }];
    expect(query.select).not.toHaveProperty('stages');
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('returns an empty mixing search and includes all record types unless filtered', async () => {
    const response = await rpc('tools/call', {
      name: 'search_mixing_records',
      arguments: {},
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [],
      pagination: { total: 0, has_next_page: false },
    });
    expect(prisma.productionOrderMixingRecords.count).toHaveBeenCalledWith({
      where: {},
    });
  });

  it('reads complete saved mixing records in requested order and reports missing IDs', async () => {
    const parameter = {
      id: 3,
      parameter_name: 'pH',
      requirement: '5-7',
      result_value: '6.2',
      unit: null,
      recordedBy: { name: 'QA', username: 'qa' },
    };
    const first = {
      id: 1,
      record_type: 'mixing',
      template_version: '1',
      stages: [
        {
          stage_name: 'Pha chế',
          steps: [{ step_name: 'Đo pH', parameters: [parameter] }],
        },
      ],
      productionOrder: { id: 7, item_code: 'BTP0001' },
    };
    const second = { id: 3, record_type: 'primary_packaging', stages: [] };
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([
      first,
      second,
    ]);
    const response = await rpc('tools/call', {
      name: 'get_mixing_records',
      arguments: { ids: [3, 2, 1] },
    }).expect(200);
    expect(body(response).result.structuredContent).toEqual({
      view: 'full',
      requested: 3,
      returned: 2,
      missing_ids: [2],
      data: [second, first],
    });
    expect(prisma.productionOrderMixingRecords.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [3, 2, 1] } },
        include: expect.objectContaining({
          createdBy: { select: { name: true, username: true } },
          stages: expect.objectContaining({
            orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
          }),
        }),
      }),
    );
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('returns only entered parameters in compact results view, retaining zero/false, notes and image references', async () => {
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([
      {
        id: 1,
        record_type: 'mixing',
        stages: [
          {
            stage_name: 'S1',
            steps: [
              {
                step_name: 'B1',
                parameters: [
                  { id: 1, parameter_name: 'Zero', result_value: '0' },
                  { id: 2, parameter_name: 'Boolean', result_value: 'false' },
                  { id: 3, parameter_name: 'Blank', result_value: '   ' },
                  {
                    id: 4,
                    parameter_name: 'Image',
                    result_image_path: '/images/result.png',
                  },
                  { id: 5, parameter_name: 'Note', note: 'Ghi chú' },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'get_mixing_records',
      arguments: { ids: [1], view: 'results' },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      view: 'results',
      data: [
        {
          id: 1,
          parameters: [
            { id: 1, stage_name: 'S1', step_name: 'B1', result_value: '0' },
            { id: 2, result_value: 'false' },
            { id: 4, result_image_path: '/images/result.png' },
            { id: 5, note: 'Ghi chú' },
          ],
        },
      ],
    });
    const data = body(response).result.structuredContent.data as object[];
    expect(data[0]).not.toHaveProperty('stages');
    expect(response.text).not.toContain('Blank');
  });

  it('explicitly reports all missing mixing IDs', async () => {
    const response = await rpc('tools/call', {
      name: 'get_mixing_records',
      arguments: { ids: [999] },
    }).expect(200);
    expect(body(response).result.structuredContent).toEqual({
      view: 'full',
      requested: 1,
      returned: 0,
      missing_ids: [999],
      data: [],
    });
  });

  it.each([
    ['get_mixing_records', { ids: [] }],
    ['get_mixing_records', { ids: [1, 1] }],
    ['get_mixing_records', { ids: [0] }],
    [
      'get_mixing_records',
      { ids: Array.from({ length: 11 }, (_, i) => i + 1) },
    ],
    ['get_mixing_records', { ids: [1], view: 'unknown' }],
    [
      'search_mixing_records',
      { date_from: '2026-10-19', date_to: '2026-10-18' },
    ],
    ['search_mixing_records', { date_from: '2026-02-30' }],
    ['search_mixing_records', { limit: 101 }],
    ['search_mixing_records', { qa_status: 'done' }],
    ['search_mixing_records', { item_code: ' ' }],
  ] as [string, object][])(
    'validates mixing arguments for %s: %j',
    async (name, arguments_) => {
      const response = await rpc('tools/call', {
        name,
        arguments: arguments_,
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(
        prisma.productionOrderMixingRecords.findMany,
      ).not.toHaveBeenCalled();
      expect(prisma.productionOrderMixingRecords.count).not.toHaveBeenCalled();
    },
  );

  it.each(['search_mixing_records', 'get_mixing_records'])(
    'requires order read permission for %s',
    async (name) => {
      const identity = authenticated();
      identity.auth.extra.permissions = ['production-orders.list'];
      oauth.resolveMcpToken.mockResolvedValue(identity);
      const response = await rpc('tools/call', {
        name,
        arguments: name === 'get_mixing_records' ? { ids: [1] } : {},
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(
        prisma.productionOrderMixingRecords.findMany,
      ).not.toHaveBeenCalled();
      expect(prisma.productionOrderMixingRecords.count).not.toHaveBeenCalled();
    },
  );

  it('aggregates latest PYCLM through the statistics tool without loading orders', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ matched_orders: 3n }])
      .mockResolvedValueOnce([
        {
          has_group: 1,
          total_groups: 1n,
          group_key: 'all',
          order_count: 3n,
          sent_count: 2n,
          not_sent_count: 1n,
          without_request_count: 1n,
          sent_percent: new Prisma.Decimal('66.6667'),
        },
      ]);
    const response = await rpc('tools/call', {
      name: 'get_production_statistics',
      arguments: {
        metrics: ['pyclm'],
        date_from: '2026-10-01',
        date_to: '2026-10-18',
      },
    }).expect(200);
    const result = body(response).result;
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      matched_orders: 3,
      reports: {
        pyclm: {
          data: [{ order_count: 3, sent_count: 2, not_sent_count: 1 }],
          pagination: { total_groups: 1 },
        },
      },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.productionOrders.findMany).not.toHaveBeenCalled();
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('returns numeric parameter analysis through MCP with a whole-dataset summary', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          order_count: 2n,
          record_count: 2n,
          slot_count: 6n,
          measurement_count: 4n,
          valid_order_count: 2n,
          missing_count: 2n,
          invalid_count: 0n,
          non_numeric_type_count: 0n,
        },
      ])
      .mockResolvedValueOnce([
        {
          has_group: 1,
          total_groups: 1n,
          item_code: 'BTP0001',
          group_key: 'all',
          unit: null,
          min_value: new Prisma.Decimal('6'),
          max_value: new Prisma.Decimal('7'),
          average_value: new Prisma.Decimal('6.5'),
          population_stddev: '0.5',
          measurement_count: 4n,
          production_order_id: null,
        },
      ]);
    const response = await rpc('tools/call', {
      name: 'analyze_production_parameters',
      arguments: {
        source: 'post_preparation_solution_checks',
        parameter: 'ph',
        item_code: 'BTP0001',
        all_time: true,
      },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      summary: { order_count: 2, measurement_count: 4, missing_count: 2 },
      data: [{ average_value: 6.5, min_value: 6, max_value: 7 }],
      date_range: { mode: 'all_time' },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['get_production_statistics', { metrics: ['packaging_pending'] }],
    [
      'analyze_production_parameters',
      {
        source: 'steam_sterilization_checks',
        parameter: 'setting_temperature',
      },
    ],
  ])(
    'enforces source permissions before database work for %s',
    async (name, args) => {
      const response = await rpc('tools/call', {
        name,
        arguments: args,
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['get_production_statistics', { metrics: ['orders', 'orders'] }],
    [
      'analyze_production_parameters',
      { source: 'post_preparation_solution_checks', parameter: 'password' },
    ],
    [
      'analyze_production_parameters',
      {
        source: 'mixing_records',
        parameter: 'pH',
        all_time: true,
        today: true,
      },
    ],
  ])('validates analytics arguments before SQL for %s', async (name, args) => {
    const response = await rpc('tools/call', { name, arguments: args }).expect(
      200,
    );
    expect(body(response).result.isError).toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('searches weighing records with exact order/material, date, approval and entered-weight filters', async () => {
    prisma.productionOrderWeighingRecords.count.mockResolvedValue(2);
    prisma.productionOrderWeighingRecords.findMany.mockResolvedValue([
      { id: 4, description: 'Weighing' },
    ]);
    const response = await rpc('tools/call', {
      name: 'search_weighing_records',
      arguments: {
        production_order_id: 7,
        material_code: 'NL001',
        qa_status: 'approved',
        ipc_status: 'pending',
        has_weights: true,
        date_to: '2026-10-25',
        page: 2,
        limit: 1,
      },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent.pagination).toMatchObject({
      page: 2,
      total: 2,
      has_next_page: false,
    });
    expect(prisma.productionOrderWeighingRecords.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          production_order_id: 7,
          lines: { some: { item_code: 'NL001' } },
          qa_staff_approved_by_id: { not: null },
          ipc_staff_approved_by_id: null,
          created_at: { lt: new Date('2026-10-25T17:00:00Z') },
        }),
        skip: 1,
        take: 1,
      }),
    );
    const query =
      prisma.productionOrderWeighingRecords.findMany.mock.calls[0][0];
    expect(query.select).not.toHaveProperty('lines');
    expect(query.select._count).toEqual({ select: { lines: true } });
  });

  it('reads weighing records in requested order, preserving each weighing, images and precise totals', async () => {
    const line = {
      id: 1,
      item_code: 'NL001',
      unit: 'g',
      planned_quantity: new Prisma.Decimal('0.1'),
      details: [
        {
          id: 1,
          net_weight: new Prisma.Decimal('0.3'),
          unit: 'g',
          note: 'note',
          weighedBy: { id: 4, name: 'Weigher' },
          images: [
            { id: 1, image_path: '/images/a.png' },
            { id: 2, image_path: '/images/b.png' },
          ],
        },
      ],
    };
    prisma.productionOrderWeighingRecords.findMany.mockResolvedValue([
      {
        id: 1,
        lines: [
          line,
          {
            ...line,
            id: 2,
            planned_quantity: new Prisma.Decimal('0.2'),
            details: [{ net_weight: new Prisma.Decimal('-0.1'), unit: 'g' }],
          },
        ],
      },
      { id: 3, lines: [] },
    ]);
    const response = await rpc('tools/call', {
      name: 'get_weighing_records',
      arguments: { ids: [3, 99, 1] },
    }).expect(200);
    const result = body(response).result.structuredContent as any;
    expect(result.document_type).toBe('weighing_record');
    expect(result.document_label).toBe('Phiếu cân');
    expect(result.source).toBe('EBR / ProductionOrderWeighingRecords');
    expect(result.missing_ids).toEqual([99]);
    expect(result.data.map((row) => row.id)).toEqual([3, 1]);
    expect(result.data[1].material_totals).toEqual([
      {
        item_code: 'NL001',
        unit: 'g',
        line_ids: [1, 2],
        required_quantity: '0.3',
        actual_quantities: [{ unit: 'g', quantity: '0.2' }],
        weighing_count: 2,
      },
    ]);
    expect(result.data[1].lines[0].details[0].images).toHaveLength(2);
    expect(result.data[1].lines[0].details[0].note).toBe('note');
    const query =
      prisma.productionOrderWeighingRecords.findMany.mock.calls[0][0];
    expect(query.select.createdBy.select).toEqual({
      id: true,
      name: true,
      username: true,
    });
    expect(query.select.lines.select.details.select.weighedBy.select).toEqual({
      id: true,
      name: true,
      username: true,
    });
  });

  it.each([true, false, null])(
    'exports lot-check result %j with its checker and time',
    async (isCorrect) => {
      const checkedAt = new Date('2026-10-26T01:00:00Z');
      const lotCheck =
        isCorrect === null
          ? null
          : {
              id: 9,
              is_correct: isCorrect,
              checked_by_id: 4,
              checked_at: checkedAt,
              checkedBy: { id: 4, name: 'Người kiểm tra', username: 'checker' },
            };
      prisma.productionOrderWeighingRecords.findMany.mockResolvedValue([
        {
          id: 1,
          lines: [
            {
              id: 7,
              item_code: 'NL001',
              lot_no: 'LOT001',
              planned_quantity: new Prisma.Decimal(1),
              unit: 'Gam',
              lotCheck,
              details: [],
            },
          ],
        },
      ]);
      const response = await rpc('tools/call', {
        name: 'get_weighing_records',
        arguments: { ids: [1] },
      }).expect(200);
      expect(body(response).result.isError).not.toBe(true);
      expect(body(response).result.structuredContent).toMatchObject({
        data: [
          {
            lines: [
              {
                lot_no: 'LOT001',
                lotCheck: lotCheck
                  ? { ...lotCheck, checked_at: checkedAt.toISOString() }
                  : null,
              },
            ],
          },
        ],
      });
      const query =
        prisma.productionOrderWeighingRecords.findMany.mock.calls[0][0];
      expect(query.select.lines.select.lotCheck.select).toEqual({
        id: true,
        is_correct: true,
        checked_by_id: true,
        checked_at: true,
        checkedBy: { select: { id: true, name: true, username: true } },
        images: {
          orderBy: { id: 'asc' },
          select: { id: true, image_path: true, created_at: true },
        },
      });
    },
  );

  it('returns only weighed lines in results view while keeping all required totals', async () => {
    prisma.productionOrderWeighingRecords.findMany.mockResolvedValue([
      {
        id: 1,
        lines: [
          {
            id: 1,
            item_code: 'A',
            unit: 'g',
            planned_quantity: new Prisma.Decimal(2),
            details: [],
          },
          {
            id: 2,
            item_code: 'A',
            unit: 'g',
            planned_quantity: new Prisma.Decimal(3),
            details: [{ net_weight: new Prisma.Decimal(-1), unit: 'g' }],
          },
        ],
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'get_weighing_records',
      arguments: { ids: [1], view: 'results' },
    }).expect(200);
    const result = body(response).result.structuredContent as any;
    expect(result.data[0].lines.map((line) => line.id)).toEqual([2]);
    expect(result.data[0].material_totals[0].required_quantity).toBe('5');
  });

  it.each([
    ['get_weighing_records', { ids: [] }],
    ['get_weighing_records', { ids: [1, 1] }],
    [
      'get_weighing_records',
      { ids: Array.from({ length: 11 }, (_, i) => i + 1) },
    ],
    ['get_weighing_records', { ids: [0] }],
    ['get_weighing_records', { ids: [1], view: 'unknown' }],
    ['search_weighing_records', { qa_status: 'done' }],
    ['search_weighing_records', { status: 'unknown' }],
    [
      'search_weighing_records',
      { date_from: '2026-10-26', date_to: '2026-10-25' },
    ],
    ['search_weighing_records', { limit: 101 }],
    ['search_weighing_records', { material_code: ' ' }],
  ])('validates weighing arguments for %s: %j', async (name, args) => {
    const response = await rpc('tools/call', { name, arguments: args }).expect(
      200,
    );
    expect(body(response).result.isError).toBe(true);
    expect(
      prisma.productionOrderWeighingRecords.findMany,
    ).not.toHaveBeenCalled();
  });

  it.each(['search_weighing_records', 'get_weighing_records'])(
    'requires read permission for %s',
    async (name) => {
      const identity = authenticated();
      identity.auth.extra.permissions = ['production-orders.list'];
      oauth.resolveMcpToken.mockResolvedValue(identity);
      const response = await rpc('tools/call', {
        name,
        arguments: name === 'get_weighing_records' ? { ids: [1] } : {},
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(
        prisma.productionOrderWeighingRecords.findMany,
      ).not.toHaveBeenCalled();
      expect(
        prisma.productionOrderWeighingRecords.count,
      ).not.toHaveBeenCalled();
    },
  );

  it('links weighing records from the production-order detail without loading their contents', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      weighingRecords: [{ id: 5 }, { id: 6 }],
      samplingRequests: [],
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    const result = body(response).result.structuredContent as any;
    expect(result.data.sections.weighing_records).toEqual({
      available: true,
      total: 2,
      ids: [5, 6],
      detail_tool: 'get_weighing_records',
    });
    expect(
      prisma.productionOrders.findUnique.mock.calls[0][0].select.weighingRecords
        .select,
    ).toEqual({ id: true });
  });

  it('reads warehouse-release SAP lines with stage/unit references and pagination', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      item_code: 'BTP001',
      lot_no: 'LOT',
    });
    sap.getProductionOrderById.mockResolvedValue({
      ProductionOrderLines: [
        {
          LineNumber: 0,
          ItemNo: 'NL001',
          PlannedQuantity: '0.123456',
          StageID: 0,
          UoMEntry: 0,
        },
        {
          LineNumber: 1,
          ItemNo: 'NL002',
          PlannedQuantity: 12,
          IssuedQuantity: 5,
          Warehouse: 'K01',
          StageID: 4,
          UoMEntry: 9,
        },
      ],
      ProductionOrdersStages: [{ StageID: 0, Name: 'Cân' }],
    });
    sap.getUnitOfMeasurements.mockResolvedValue([
      { AbsEntry: 0, Code: 'Gam', Name: 'Gam' },
    ]);
    const response = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7, limit: 1 },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent).toMatchObject({
      document_type: 'warehouse_release',
      document_label: 'Phiếu xuất kho',
      production_order: { id: 7 },
      data: [
        {
          LineNumber: 0,
          PlannedQuantity: '0.123456',
          ProductionOrdersStage: { StageID: 0, Name: 'Cân' },
          UnitOfMeasurement: { AbsEntry: 0, Code: 'Gam' },
        },
      ],
      pagination: {
        page: 1,
        limit: 1,
        total: 2,
        total_pages: 2,
        has_next_page: true,
      },
    });
    const second = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7, page: 2, limit: 1 },
    }).expect(200);
    expect(body(second).result.structuredContent).toMatchObject({
      data: [
        {
          LineNumber: 1,
          IssuedQuantity: 5,
          Warehouse: 'K01',
          ProductionOrdersStage: null,
          UnitOfMeasurement: null,
        },
      ],
      pagination: { has_next_page: false },
    });
    expect(sap.getProductionOrderById).toHaveBeenCalledWith(7);
  });

  it('returns an empty warehouse-release list when SAP has no lines', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    sap.getProductionOrderById.mockResolvedValue({});
    sap.getUnitOfMeasurements.mockResolvedValue([]);
    const response = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [],
      pagination: { total: 0, has_next_page: false },
    });
  });

  it('does not contact SAP for a missing or out-of-scope lot', async () => {
    const response = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(sap.getProductionOrderById).not.toHaveBeenCalled();
    prisma.userRoles.findMany.mockResolvedValue([
      { roles: { production_order_read_limit: 0 } },
    ]);
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    const hidden = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(hidden).result.isError).toBe(true);
    expect(sap.getProductionOrderById).not.toHaveBeenCalled();
  });

  it('requires read permission before accessing warehouse-release data', async () => {
    const auth = authenticated();
    auth.auth.extra.permissions = ['production-orders.list'];
    oauth.resolveMcpToken.mockResolvedValue(auth);
    const response = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
    expect(sap.getProductionOrderById).not.toHaveBeenCalled();
  });

  it.each([
    { production_order_id: 0 },
    { production_order_id: '7' },
    { production_order_id: 7, limit: 101 },
    { production_order_id: 7, page: 0 },
    { production_order_id: 7, arbitrary: true },
  ])('validates warehouse-release input %j', async (args) => {
    const response = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: args,
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(sap.getProductionOrderById).not.toHaveBeenCalled();
  });

  it('does not expose SAP connection errors or credentials', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    sap.getProductionOrderById.mockRejectedValue(
      new Error('SAP password=secret'),
    );
    sap.getUnitOfMeasurements.mockResolvedValue([]);
    const response = await rpc('tools/call', {
      name: 'get_warehouse_release',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(JSON.stringify(body(response).result)).not.toContain(
      'password=secret',
    );
  });

  it('exposes exactly thirteen read-only tools', async () => {
    const response = await rpc('tools/list').expect(200);
    expect(body(response).result.tools.map((tool) => tool.name)).toEqual([
      'get_server_info',
      'search_production_orders',
      'get_production_order',
      'get_warehouse_release',
      'search_items',
      'get_item',
      'search_production_order_deviations',
      'search_weighing_records',
      'get_weighing_records',
      'search_mixing_records',
      'get_mixing_records',
      'analyze_production_parameters',
      'get_production_statistics',
    ]);
    expect(
      body(response).result.tools.every(
        (tool) => tool.annotations.readOnlyHint,
      ),
    ).toBe(true);
  });

  function allowDeviationSearch(...permissions: string[]) {
    const identity = authenticated();
    identity.auth.extra.permissions = permissions;
    oauth.resolveMcpToken.mockResolvedValue(identity);
  }

  it('counts deviations directly without reading records or production-order details', async () => {
    allowDeviationSearch('production-order-deviations.list');
    prisma.productionOrderDeviations.count.mockResolvedValue(75);
    const response = await rpc('tools/call', {
      name: 'search_production_order_deviations',
      arguments: {
        mode: 'count',
        item_code: ' TP001 ',
        lot_no: ' LOT1 ',
        production_order_id: 7,
        approval_status: 'pending',
        query: ' nhiệt độ ',
        date_from: '2026-10-01',
        date_to: '2026-10-17',
      },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent).toMatchObject({
      mode: 'count',
      total: 75,
      date_range: {
        timezone: 'Asia/Ho_Chi_Minh',
        field: 'created_at',
        from_inclusive: '2026-09-30T17:00:00.000Z',
        to_exclusive: '2026-10-17T17:00:00.000Z',
      },
    });
    expect(prisma.productionOrderDeviations.count).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        production_order_id: 7,
        productionOrder: { is: { item_code: 'TP001', lot_no: 'LOT1' } },
        created_at: {
          gte: new Date('2026-09-30T17:00:00Z'),
          lt: new Date('2026-10-17T17:00:00Z'),
        },
        approver_id: null,
        OR: [
          { deviation_content: { contains: 'nhiệt độ' } },
          { cause: { contains: 'nhiệt độ' } },
          { handling_plan: { contains: 'nhiệt độ' } },
          { handling_result: { contains: 'nhiệt độ' } },
        ],
      },
    });
    expect(body(response).result.structuredContent).not.toHaveProperty('data');
    expect(prisma.productionOrderDeviations.findMany).not.toHaveBeenCalled();
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists deviations across orders with precise quantities, safe images and stable database pagination', async () => {
    allowDeviationSearch(
      'production-order-deviations.list',
      'production-order-deviations.read',
    );
    prisma.productionOrderDeviations.count.mockResolvedValue(45);
    prisma.productionOrderDeviations.findMany.mockResolvedValue([
      {
        id: 99,
        deviation_content: 'Nhiệt độ',
        created_at: new Date('2026-10-17T01:00:00Z'),
        affected_quantity: new Prisma.Decimal('1.234'),
        affected_quantity_unit: 'kg',
        reporter: { id: 1, name: 'QA', username: 'qa' },
        productionOrder: {
          id: 7,
          production_order_code: 'LSX007',
          item_code: 'TP001',
          item: { item_name: 'Sản phẩm A' },
          lot_no: 'LOT1',
        },
        images: [
          {
            id: 1,
            image_path: '/uploads/production-order-deviations/test.png',
          },
        ],
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'search_production_order_deviations',
      arguments: { page: 2, item_code: 'TP001', approval_status: 'approved' },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      mode: 'list',
      total: 45,
      data: [
        {
          id: 99,
          affected_quantity: '1.234',
          created_at: '2026-10-17T01:00:00.000Z',
          production_order: {
            production_order_code: 'LSX007',
            item_code: 'TP001',
            lot_no: 'LOT1',
          },
          images: [
            { image_path: '/production-order-deviations/images/test.png' },
          ],
        },
      ],
      pagination: {
        page: 2,
        limit: 20,
        total: 45,
        total_pages: 3,
        has_next_page: true,
      },
    });
    const where = {
      deleted_at: null,
      productionOrder: { is: { item_code: 'TP001' } },
      approver_id: { not: null },
    };
    expect(prisma.productionOrderDeviations.count).toHaveBeenCalledWith({
      where,
    });
    expect(prisma.productionOrderDeviations.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 20,
        take: 20,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        select: expect.objectContaining({
          reporter: { select: { id: true, name: true, username: true } },
          approver: { select: { id: true, name: true, username: true } },
          images: expect.objectContaining({ where: { deleted_at: null } }),
        }),
      }),
    );
    const data = body(response).result.structuredContent.data as Record<
      string,
      unknown
    >[];
    expect(data[0]).not.toHaveProperty('productionOrder');
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('defaults to all dates and returns an empty list instead of treating an unmatched filter as an error', async () => {
    allowDeviationSearch(
      'production-order-deviations.list',
      'production-order-deviations.read',
    );
    const response = await rpc('tools/call', {
      name: 'search_production_order_deviations',
      arguments: { production_order_id: 999 },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      mode: 'list',
      total: 0,
      data: [],
      date_range: { date_from: null, date_to: null },
      pagination: { page: 1, limit: 20, total_pages: 0, has_next_page: false },
    });
    expect(prisma.productionOrderDeviations.count).toHaveBeenCalledWith({
      where: { deleted_at: null, production_order_id: 999 },
    });
  });

  it.each([
    ['count', ['production-order-deviations.read']],
    ['list', ['production-order-deviations.list']],
    ['list', ['production-orders.list', 'production-orders.read']],
  ] as [string, string[]][])(
    'requires deviation permissions before %s queries',
    async (mode, permissions) => {
      allowDeviationSearch(...permissions);
      const response = await rpc('tools/call', {
        name: 'search_production_order_deviations',
        arguments: { mode },
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.productionOrderDeviations.count).not.toHaveBeenCalled();
      expect(prisma.productionOrderDeviations.findMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    { mode: 'other' },
    { today: true, date_from: '2026-10-17' },
    { date_from: '2026-10-18', date_to: '2026-10-17' },
    { date_from: '2026-02-30' },
    { date_to: '2026-10-17T00:00:00Z' },
    { production_order_id: 0 },
    { item_code: ' ' },
    { query: ' ' },
    { limit: 101 },
    { page: 0 },
    { approval_status: 'resolved' },
    { unknown: true },
  ])('validates cross-order deviation filters: %j', async (arguments_) => {
    allowDeviationSearch(
      'production-order-deviations.list',
      'production-order-deviations.read',
    );
    const response = await rpc('tools/call', {
      name: 'search_production_order_deviations',
      arguments: arguments_,
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrderDeviations.count).not.toHaveBeenCalled();
    expect(prisma.productionOrderDeviations.findMany).not.toHaveBeenCalled();
  });

  it('sanitizes failures in the deviation count query', async () => {
    allowDeviationSearch('production-order-deviations.list');
    prisma.productionOrderDeviations.count.mockRejectedValueOnce(
      new Error('private database failure'),
    );
    const response = await rpc('tools/call', {
      name: 'search_production_order_deviations',
      arguments: { mode: 'count' },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(response.text).not.toContain('private database failure');
  });

  it.each([
    'get_production_order_mixing_records',
    'get_production_order_deviations',
    'get_production_order_completeness',
    'get_production_order_summaries',
    'get_production_order_factory_release_reviews',
    'get_production_order_checks',
    'get_production_order_packaging',
    'get_production_order_sampling',
    'get_production_order_attachments',
    'get_production_order_materials',
    'get_production_order_records',
  ])('does not execute the removed tool %s', async (name) => {
    const response = await rpc('tools/call', {
      name,
      arguments: { production_order_id: 7 },
    }).expect(200);
    const envelope = body(response);
    expect(envelope.result?.isError || 'error' in envelope).toBe(true);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('returns every authorized section without per-section record limits', async () => {
    const identity = authenticated();
    identity.auth.extra.permissions.push(
      ...Object.values(recordSections).map((section) => section.permission),
    );
    oauth.resolveMcpToken.mockResolvedValue(identity);
    const rows = Array.from({ length: 27 }, (_, i) => ({
      id: i + 1,
      quantity: new Prisma.Decimal('1.234'),
    }));
    const order: Record<string, unknown> = { id: 7, lot_no: 'LOT-7' };
    for (const config of Object.values(recordSections)) {
      order[config.relation] = config.singleton ? rows[0] : rows;
    }
    order.deviations = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      affected_quantity: new Prisma.Decimal('1.234'),
      images: [
        { id: 1, image_path: '/uploads/production-order-deviations/test.png' },
      ],
    }));
    order.mixingRecords = [
      {
        id: 1,
        record_type: 'mixing',
        stages: [
          { steps: [{ parameters: [{ result_value: '10', unit: 'phút' }] }] },
        ],
      },
      { id: 2, record_type: 'primary_packaging', stages: [] },
    ];
    prisma.productionOrders.findUnique.mockResolvedValue(order);
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    const data = body(response).result.structuredContent.data as {
      sections: Record<
        string,
        { available: boolean; total: number; data: Record<string, unknown>[] }
      >;
    };
    for (const [key, config] of Object.entries(recordSections)) {
      expect(data.sections[key]).toMatchObject({
        available: true,
        total: config.singleton ? 1 : 27,
      });
      expect(data.sections[key].data).toHaveLength(config.singleton ? 1 : 27);
      expect(data).not.toHaveProperty(config.relation);
    }
    expect(data.sections.environment_checks.data[26].quantity).toBe('1.234');
    expect(data.sections.deviations.total).toBe(25);
    expect(data.sections.deviations.data[0]).toMatchObject({
      affected_quantity: '1.234',
      images: [{ image_path: '/production-order-deviations/images/test.png' }],
    });
    expect(data.sections.mixing_records).toEqual({
      available: true,
      total: 2,
      ids: [1, 2],
      detail_tool: 'get_mixing_records',
    });
    expect(response.text).not.toContain('result_value');
    const [query] = prisma.productionOrders.findUnique.mock.calls[0] as [
      { where: { id: number }; select: Record<string, unknown> },
    ];
    expect(query.where).toEqual({ id: 7 });
    for (const config of Object.values(recordSections)) {
      expect(query.select[config.relation]).not.toHaveProperty('take');
      expect(query.select[config.relation]).not.toHaveProperty('skip');
    }
    expect(query.select.deviations).toMatchObject({
      where: { deleted_at: null },
      select: { images: { where: { deleted_at: null } } },
    });
    expect(query.select.deviations).not.toHaveProperty('take');
    expect(query.select.mixingRecords).not.toHaveProperty('where');
    expect(query.select.mixingRecords).not.toHaveProperty('take');
    expect(query.select.mixingRecords).toMatchObject({ select: { id: true } });
    expect(query.select.mixingRecords).not.toHaveProperty('include');
    expect(query.select.equipmentMonitoringRecords).toMatchObject({
      where: { deleted_at: null },
    });
    expect(query.select).not.toHaveProperty('materialSummaries');
    expect(query.select).not.toHaveProperty('production_order_lines');
  });

  it('does not query or expose protected sections when the specialized permission is missing', async () => {
    const identity = authenticated();
    identity.auth.extra.permissions = ['production-orders.read'];
    oauth.resolveMcpToken.mockResolvedValue(identity);
    // Even if a mock returns unrelated data, denied groups are never serialized.
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      deviations: [{ deviation_content: 'private deviation' }],
      steamSterilizationChecks: [{ equipment_name: 'private equipment' }],
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    const data = body(response).result.structuredContent.data as {
      sections: Record<string, unknown>;
    };
    for (const [key, config] of Object.entries(recordSections)) {
      if (config.permission !== 'production-orders.read')
        expect(data.sections[key]).toEqual({
          available: false,
          reason: 'permission_required',
        });
    }
    expect(data.sections.deviations).toEqual({
      available: false,
      reason: 'permission_required',
    });
    expect(response.text).not.toContain('private deviation');
    expect(response.text).not.toContain('private equipment');
    const [query] = prisma.productionOrders.findUnique.mock.calls[0] as [
      { select: Record<string, unknown> },
    ];
    expect(query.select).not.toHaveProperty('deviations');
    for (const config of Object.values(recordSections)) {
      if (config.permission !== 'production-orders.read')
        expect(query.select).not.toHaveProperty(config.relation);
    }
  });

  it('distinguishes empty local sections from unavailable external checklist requirements', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    completeness.findByProductionOrder.mockResolvedValueOnce({
      is_complete: false,
      missing_sections: [],
      unavailable_sections: [
        { key: 'production_order_lines', status: 'unavailable' },
      ],
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      sections: {
        sampling_records: { available: true, total: 0, data: [] },
        mixing_records: {
          available: true,
          total: 0,
          ids: [],
          detail_tool: 'get_mixing_records',
        },
      },
      completeness: {
        available: true,
        is_complete: false,
        unavailable_sections: [{ status: 'unavailable' }],
      },
    });
  });

  it('returns document milestones, guide reference, latest PYCLM and its complete history', async () => {
    const user = { id: 2, name: 'QA', username: 'qa' };
    const date = new Date('2026-10-15T01:00:00Z');
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      warehouse: 'KHO01',
      packing_specification: 'Hộp 10 vỉ',
      remarks: 'Ghi chú',
      internal_notes: 'Nội bộ',
      change_content: 'Cập nhật',
      item: {
        item_name: 'Sản phẩm A',
        registration: { registration_number: 'CURRENT' },
      },
      registrationNumber: { registration_number: 'SAVED' },
      samplingRequests: [
        { id: 2, status: 'sent', sent_at: date, sender: user },
        { id: 1, status: 'sent' },
      ],
      documentControl: {
        id: 1,
        deleted_at: null,
        batch_record_issued_at: date,
        batchRecordIssuedBy: user,
        batch_record_received_at: null,
      },
      productionGuide: { id: 3, original_filename: 'guide.pdf' },
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      warehouse: 'KHO01',
      packing_specification: 'Hộp 10 vỉ',
      internal_notes: 'Nội bộ',
      registration_number: 'SAVED',
      pyclm: { isSent: true, sentAt: date.toISOString(), sender: user },
      documentControl: {
        batch_record_issued_at: date.toISOString(),
        batchRecordIssuedBy: user,
        batch_record_received_at: null,
      },
      productionGuide: {
        original_filename: 'guide.pdf',
        file_path: '/production-orders/7/production-guide/file',
      },
      sections: {
        sampling_requests: {
          available: true,
          total: 2,
          data: [{ id: 2 }, { id: 1 }],
        },
      },
    });
    const data = body(response).result.structuredContent.data as Record<
      string,
      unknown
    >;
    expect(data.documentControl).not.toHaveProperty('deleted_at');
    expect(data).not.toHaveProperty('samplingRequests');
  });

  it.each([
    { status: 'sent', expected: 'SAVED' },
    { status: 'draft', expected: 'CURRENT' },
    { status: null, expected: 'CURRENT' },
  ])(
    'preserves frontend registration selection for $status',
    async ({ status, expected }) => {
      prisma.productionOrders.findUnique.mockResolvedValue({
        id: 7,
        item: {
          item_name: 'A',
          registration: { registration_number: 'CURRENT' },
        },
        registrationNumber: { registration_number: 'SAVED' },
        samplingRequests: status ? [{ status }] : [],
        documentControl: { deleted_at: new Date() },
      });
      const response = await rpc('tools/call', {
        name: 'get_production_order',
        arguments: { id: 7 },
      }).expect(200);
      expect(body(response).result.structuredContent.data).toMatchObject({
        registration_number: expected,
        documentControl: null,
      });
    },
  );

  it('keeps a missing saved registration null after PYCLM is sent', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      item: {
        item_name: 'A',
        registration: { registration_number: 'CURRENT' },
      },
      samplingRequests: [{ status: 'sent' }],
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      registration_number: null,
    });
  });

  it('keeps records readable if the completeness check fails', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    completeness.findByProductionOrder.mockRejectedValueOnce(
      new Error('private failure'),
    );
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent.data).toMatchObject({
      completeness: { available: false },
    });
    expect(response.text).not.toContain('private failure');
  });

  it('requires order read permission before querying full detail', async () => {
    const identity = authenticated();
    identity.auth.extra.permissions = ['production-order-deviations.read'];
    oauth.resolveMcpToken.mockResolvedValue(identity);
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });
});
