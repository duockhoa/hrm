import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { PrismaService } from '../../prisma.service';
import { McpModule } from './mcp.module';
import { OAuthService } from '../mcp-oauth/oauth.service';
import { Prisma } from '@prisma/client';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';
import { recordSections } from './mcp-record-sections';

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
    items: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    productionOrders: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const completeness = { findByProductionOrder: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(OAuthService)
      .useValue(oauth)
      .overrideProvider(ProductionOrderLocalCompletenessService)
      .useValue(completeness)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.items.count.mockResolvedValue(0);
    prisma.items.findMany.mockResolvedValue([]);
    prisma.items.findFirst.mockResolvedValue(null);
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
          { key: 'mixing_records', enabled: true, required: true, order: 10 },
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

  it('exposes exactly five read-only tools', async () => {
    const response = await rpc('tools/list').expect(200);
    expect(body(response).result.tools.map((tool) => tool.name)).toEqual([
      'get_server_info',
      'search_production_orders',
      'get_production_order',
      'search_items',
      'get_item',
    ]);
    expect(
      body(response).result.tools.every(
        (tool) => tool.annotations.readOnlyHint,
      ),
    ).toBe(true);
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
    expect(data.sections.mixing_records.data).toEqual(order.mixingRecords);
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
        mixing_records: { available: true, total: 0, data: [] },
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
