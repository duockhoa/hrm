import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { PrismaService } from '../../prisma.service';
import { McpModule } from './mcp.module';
import { mixingRecordsReportInclude } from '../production-orders/exports/mixing-records-report-html';
import { OAuthService } from '../mcp-oauth/oauth.service';
import { Prisma } from '@prisma/client';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';
import {
  recordSections,
  recordTools,
  type RecordSection,
} from './mcp-record-sections';

const sectionToolCases: [string, RecordSection][] = [];
for (const tool of recordTools) {
  for (const section of tool.sections) {
    sectionToolCases.push([tool.name, section]);
  }
}

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
    productionOrders: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    productionOrderMixingRecords: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    productionOrderDeviations: { count: jest.fn(), findMany: jest.fn() },
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
    oauth.resolveMcpToken.mockResolvedValue(authenticated());
    prisma.productionOrders.count.mockResolvedValue(0);
    prisma.productionOrders.findMany.mockResolvedValue([]);
    prisma.productionOrders.findUnique.mockResolvedValue(null);
    prisma.productionOrderMixingRecords.count.mockResolvedValue(0);
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([]);
    prisma.productionOrderDeviations.count.mockResolvedValue(0);
    prisma.productionOrderDeviations.findMany.mockResolvedValue([]);
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

  it('lists the read-only tools including all production-order sections', async () => {
    const response = await rpc('tools/list').expect(200);
    expect(body(response).result.tools).toHaveLength(12);
    expect(body(response).result.tools.map((tool) => tool.name)).toEqual([
      'get_server_info',
      'search_production_orders',
      'get_production_order',
      'get_production_order_mixing_records',
      'get_production_order_deviations',
      'get_production_order_completeness',
      ...recordTools.map((tool) => tool.name),
    ]);
    expect(
      body(response).result.tools.every(
        (tool: { annotations: { readOnlyHint: boolean } }) =>
          tool.annotations.readOnlyHint,
      ),
    ).toBe(true);
  });

  it('no longer exposes or executes the material tool', async () => {
    const response = await rpc('tools/call', {
      name: 'get_production_order_materials',
      arguments: { production_order_id: 7, section: 'production_order_lines' },
    }).expect(200);
    const envelope = body(response);
    expect(envelope.result?.isError || 'error' in envelope).toBe(true);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
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

  it('returns frontend detail fields, document milestones and the latest sampling request', async () => {
    const sentAt = new Date('2026-10-15T08:00:00Z');
    const user = { id: 2, name: 'QA', username: 'qa' };
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      warehouse: 'KHO01',
      description: 'Lô thành phẩm',
      origin: 'manual',
      packing_specification: 'Hộp 10 vỉ',
      remarks: 'Ghi chú lô',
      change_content: 'Cập nhật bao bì',
      item: {
        item_name: 'Sản phẩm A',
        registration: { registration_number: 'CURRENT' },
      },
      registrationNumber: { registration_number: 'SAVED' },
      samplingRequests: [
        {
          id: 12,
          status: 'sent',
          sent_at: sentAt,
          google_doc_url: 'https://docs.google.com/document/d/example',
          location: 'Xưởng 1',
          sender: user,
        },
      ],
      documentControl: {
        deleted_at: null,
        batch_record_issued_at: sentAt,
        batchRecordIssuedBy: user,
      },
      productionGuide: { id: 3, original_filename: 'huong-dan.pdf' },
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    const data = body(response).result.structuredContent.data as Record<
      string,
      unknown
    >;
    expect(data).toMatchObject({
      warehouse: 'KHO01',
      description: 'Lô thành phẩm',
      origin: 'manual',
      packing_specification: 'Hộp 10 vỉ',
      remarks: 'Ghi chú lô',
      change_content: 'Cập nhật bao bì',
      registration_number: 'SAVED',
      item: { item_name: 'Sản phẩm A' },
      pyclm: {
        isSent: true,
        sentAt: sentAt.toISOString(),
        sender: user,
        latestSamplingRequest: { id: 12 },
      },
      documentControl: {
        batch_record_issued_at: sentAt.toISOString(),
        batchRecordIssuedBy: user,
      },
      productionGuide: { original_filename: 'huong-dan.pdf' },
    });
    expect(data).not.toHaveProperty('samplingRequests');
    expect(data).not.toHaveProperty('registrationNumber');
    expect(data.documentControl).not.toHaveProperty('deleted_at');
    expect(prisma.productionOrders.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: expect.objectContaining({
        samplingRequests: expect.objectContaining({
          take: 1,
          orderBy: [{ sent_at: 'desc' }, { id: 'desc' }],
          select: expect.objectContaining({
            sender: { select: { id: true, name: true, username: true } },
          }),
        }),
        productionGuide: {
          select: {
            id: true,
            original_filename: true,
            mime_type: true,
            file_size: true,
            created_at: true,
            updated_at: true,
          },
        },
      }),
    });
  });

  it.each([[], [{ id: 12, status: 'draft' }]])(
    'uses the product registration until the latest sampling request is sent (%j)',
    async (...requests) => {
      prisma.productionOrders.findUnique.mockResolvedValue({
        id: 7,
        item: {
          item_name: 'A',
          registration: { registration_number: 'CURRENT' },
        },
        registrationNumber: { registration_number: 'SAVED' },
        samplingRequests: requests,
        documentControl: {
          deleted_at: new Date(),
          batch_record_issued_at: new Date(),
        },
        productionGuide: null,
      });
      const response = await rpc('tools/call', {
        name: 'get_production_order',
        arguments: { id: 7 },
      }).expect(200);
      expect(body(response).result.structuredContent.data).toMatchObject({
        registration_number: 'CURRENT',
        pyclm: { isSent: false },
        documentControl: null,
        productionGuide: null,
      });
    },
  );

  it('returns explicit missing values without substituting current registration for a sent request', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      item: {
        item_name: 'A',
        registration: { registration_number: 'CURRENT' },
      },
      samplingRequests: [{ id: 12, status: 'sent' }],
      registrationNumber: null,
      documentControl: null,
      productionGuide: null,
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      registration_number: null,
      documentControl: null,
      productionGuide: null,
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

  it('includes completeness, latest yields/review and permission-controlled deviations in the overview', async () => {
    const deviation = {
      id: 5,
      deviation_content: 'Sai lệch nhiệt độ',
      affected_quantity: new Prisma.Decimal('12.345'),
      affected_quantity_unit: 'kg',
    };
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      _count: {
        deviations: 4,
        finishedProductSummaries: 2,
        factoryReleaseReviews: 1,
      },
      deviations: [deviation],
      finishedProductSummaries: [{ id: 10, package_count: 200 }],
      factoryReleaseReviews: [{ id: 11, approvedBy: null }],
    });
    completeness.findByProductionOrder.mockResolvedValue({
      required_count: 3,
      completed_count: 2,
      is_complete: false,
      missing_sections: [{ key: 'date_checks' }],
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      completeness: {
        available: true,
        required_count: 3,
        completed_count: 2,
        is_complete: false,
        missing_sections: [{ key: 'date_checks' }],
      },
      summaries: {
        finished_product: { total: 2, latest: { package_count: 200 } },
      },
      factory_release: { total: 1, latest: { approvedBy: null } },
      deviations: {
        available: true,
        total: 4,
        has_more: true,
        latest: [{ affected_quantity: '12.345', affected_quantity_unit: 'kg' }],
      },
    });
    expect(prisma.productionOrders.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          deviations: expect.objectContaining({
            where: { deleted_at: null },
            take: 3,
          }),
        }),
      }),
    );
  });

  it('does not select or expose deviation overview without its read permission', async () => {
    const identity = authenticated();
    identity.auth.extra.permissions = ['production-orders.read'];
    oauth.resolveMcpToken.mockResolvedValue(identity);
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent.data).toMatchObject({
      deviations: { available: false, reason: 'permission_required' },
    });
    const [query] = prisma.productionOrders.findUnique.mock.calls[0] as [
      {
        select: Record<string, unknown> & {
          _count: { select: Record<string, unknown> };
        };
      },
    ];
    expect(query.select).not.toHaveProperty('deviations');
    expect(query.select._count.select).not.toHaveProperty('deviations');
  });

  it('keeps the overview readable when the completeness backend is unavailable', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    completeness.findByProductionOrder.mockRejectedValueOnce(
      new Error('private service failure'),
    );
    const response = await rpc('tools/call', {
      name: 'get_production_order',
      arguments: { id: 7 },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    expect(body(response).result.structuredContent.data).toMatchObject({
      completeness: { available: false },
    });
    expect(response.text).not.toContain('private service failure');
  });

  it('exposes unavailable checklist sections without converting them to missing', async () => {
    completeness.findByProductionOrder.mockResolvedValueOnce({
      is_complete: false,
      missing_sections: [],
      unavailable_sections: [
        { key: 'production_order_lines', status: 'unavailable' },
      ],
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order_completeness',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      available: true,
      missing_sections: [],
      unavailable_sections: [{ status: 'unavailable' }],
    });
  });

  it.each(sectionToolCases)(
    'reads the scoped section via %s / %s',
    async (name, section) => {
      const config = recordSections[section];
      const identity = authenticated();
      identity.auth.extra.permissions.push(config.permission);
      oauth.resolveMcpToken.mockResolvedValue(identity);
      const row = {
        id: 9,
        quantity: new Prisma.Decimal('1.25'),
        created_at: new Date('2026-10-15T01:00:00Z'),
      };
      prisma.productionOrders.findUnique.mockResolvedValue({
        id: 7,
        lot_no: 'LOT-7',
        [config.relation]: config.singleton ? row : [row],
        ...(!config.singleton ? { _count: { [config.relation]: 3 } } : {}),
      });
      const response = await rpc('tools/call', {
        name,
        arguments: { production_order_id: 7, section, limit: 1 },
      }).expect(200);
      expect(body(response).result.isError).not.toBe(true);
      expect(body(response).result.structuredContent).toMatchObject({
        production_order: { id: 7, lot_no: 'LOT-7' },
        section,
        data: [
          { id: 9, quantity: '1.25', created_at: '2026-10-15T01:00:00.000Z' },
        ],
        pagination: {
          total: config.singleton ? 1 : 3,
          has_next_page: !config.singleton,
        },
      });
      expect(prisma.productionOrders.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
      const payload = body(response).result.structuredContent.production_order;
      expect(payload).not.toHaveProperty(config.relation);
      expect(payload).not.toHaveProperty('_count');
    },
  );

  it('applies record/time filters consistently to page data and count', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      environmentChecks: [{ id: 9 }],
      _count: { environmentChecks: 1 },
    });
    const response = await rpc('tools/call', {
      name: 'get_production_order_checks',
      arguments: {
        production_order_id: 7,
        section: 'environment_checks',
        record_id: 9,
        from: '2026-10-01T00:00:00+07:00',
        to: '2026-11-01T00:00:00+07:00',
        page: 2,
        limit: 1,
      },
    }).expect(200);
    expect(body(response).result.isError).not.toBe(true);
    const where = {
      id: 9,
      checked_at: {
        gte: new Date('2026-10-01T00:00:00+07:00'),
        lte: new Date('2026-11-01T00:00:00+07:00'),
      },
    };
    expect(prisma.productionOrders.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          environmentChecks: expect.objectContaining({
            where,
            skip: 1,
            take: 1,
            orderBy: [{ checked_at: 'desc' }, { id: 'desc' }],
          }),
          _count: { select: { environmentChecks: { where } } },
        }),
      }),
    );
  });

  it.each([
    'date_checks',
    'filtration_checks',
    'steam_sterilization_checks',
    'post_secondary_packaging_summaries',
  ] as const)(
    'requires the specialized permission before querying %s',
    async (section) => {
      const tool = recordTools.find((tool) =>
        (tool.sections as readonly string[]).includes(section),
      )!;
      const response = await rpc('tools/call', {
        name: tool.name,
        arguments: { production_order_id: 7, section },
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([
    { section: 'passwords' },
    { section: 'production_order_lines' },
    { section: 'material_summaries' },
    { section: 'environment_checks', limit: 21 },
    { section: 'environment_checks', record_id: -1 },
    {
      section: 'environment_checks',
      from: '2026-10-20T00:00:00Z',
      to: '2026-10-01T00:00:00Z',
    },
    { section: 'environment_checks', from: '2026-10-01' },
  ])(
    'rejects invalid section arguments before any query: %j',
    async (arguments_) => {
      const response = await rpc('tools/call', {
        name: 'get_production_order_checks',
        arguments: { production_order_id: 7, ...arguments_ },
      }).expect(200);
      expect(body(response).result.isError).toBe(true);
      expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
    },
  );

  it('reports empty sections and missing orders distinctly', async () => {
    prisma.productionOrders.findUnique.mockResolvedValueOnce({
      id: 7,
      samplingRecords: [],
      _count: { samplingRecords: 0 },
    });
    const empty = await rpc('tools/call', {
      name: 'get_production_order_sampling',
      arguments: { production_order_id: 7, section: 'sampling_records' },
    }).expect(200);
    expect(body(empty).result.structuredContent).toMatchObject({
      data: [],
      pagination: { total: 0, has_next_page: false },
    });
    const missing = await rpc('tools/call', {
      name: 'get_production_order_sampling',
      arguments: { production_order_id: 999, section: 'sampling_records' },
    }).expect(200);
    expect(body(missing).result.isError).toBe(true);
  });

  it.each([{ record_id: 100 }, { from: '2026-11-01T00:00:00Z' }, { page: 2 }])(
    'handles singleton filters and pagination: %j',
    async (filter) => {
      prisma.productionOrders.findUnique.mockResolvedValueOnce({
        id: 7,
        cylinderCalibration: {
          id: 9,
          created_at: new Date('2026-10-01T00:00:00Z'),
        },
      });
      const response = await rpc('tools/call', {
        name: 'get_production_order_checks',
        arguments: {
          production_order_id: 7,
          section: 'cylinder_calibration',
          ...filter,
        },
      }).expect(200);
      if ('record_id' in filter)
        expect(body(response).result.isError).toBe(true);
      else
        expect(body(response).result.structuredContent).toMatchObject({
          data: [],
          pagination: { total: 'page' in filter ? 1 : 0 },
        });
    },
  );

  it('filters deviation approval and searches content within the selected order', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: {
        production_order_id: 7,
        approval_status: 'pending',
        query: ' Nhiệt độ ',
      },
    }).expect(200);
    expect(prisma.productionOrderDeviations.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        production_order_id: 7,
        deleted_at: null,
        approver_id: null,
        OR: expect.arrayContaining([
          { deviation_content: { contains: 'Nhiệt độ' } },
        ]),
      }),
    });
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
  it('returns saved deviations with precise quantities, safe user fields and pagination', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 7,
      lot_no: 'LOT-7',
    });
    prisma.productionOrderDeviations.count.mockResolvedValue(21);
    prisma.productionOrderDeviations.findMany.mockResolvedValue([
      {
        id: 12,
        production_order_id: 7,
        deviation_content: 'Nhiệt độ vượt giới hạn',
        cause: 'Thiết bị',
        handling_plan: 'Kiểm tra thiết bị',
        handling_result: 'Đã xử lý',
        affected_quantity: new Prisma.Decimal('1.234'),
        affected_quantity_unit: 'kg',
        reporter: { id: 1, name: 'Test', username: 'test' },
        approver: null,
        images: [
          {
            id: 1,
            image_path: '/uploads/production-order-deviations/test.png',
          },
        ],
      },
    ]);
    const response = await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: { production_order_id: 7, page: 2 },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      production_order: { id: 7, lot_no: 'LOT-7' },
      data: [
        {
          id: 12,
          affected_quantity: '1.234',
          handling_result: 'Đã xử lý',
          images: [
            {
              id: 1,
              image_path: '/production-order-deviations/images/test.png',
            },
          ],
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        total_pages: 3,
        has_next_page: true,
      },
    });
    expect(prisma.productionOrderDeviations.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 7, deleted_at: null },
        skip: 10,
        take: 10,
        select: expect.objectContaining({
          reporter: { select: { id: true, name: true, username: true } },
          images: expect.objectContaining({ where: { deleted_at: null } }),
        }),
      }),
    );
  });

  it('rejects deviation access before any data query when the deviation read permission is missing', async () => {
    const identity = authenticated();
    identity.auth.extra.permissions = ['production-orders.read'];
    oauth.resolveMcpToken.mockResolvedValue(identity);
    const response = await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
    expect(prisma.productionOrderDeviations.findMany).not.toHaveBeenCalled();
  });

  it('reports an existing order with no deviations as an empty result', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    const response = await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: { production_order_id: 7 },
    }).expect(200);
    expect(body(response).result.structuredContent).toMatchObject({
      data: [],
      message: 'Lệnh sản xuất chưa có sai lệch.',
      pagination: { total: 0, has_next_page: false },
    });
  });

  it('does not query deviations for a missing production order', async () => {
    const response = await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: { production_order_id: 999 },
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrderDeviations.findMany).not.toHaveBeenCalled();
  });

  it('binds a specific deviation to its order and does not expose deleted or other-order records', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 7 });
    const response = await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: { production_order_id: 7, deviation_id: 99 },
    }).expect(200);
    expect(prisma.productionOrderDeviations.count).toHaveBeenCalledWith({
      where: { production_order_id: 7, id: 99, deleted_at: null },
    });
    expect(body(response).result.isError).toBe(true);
  });

  it.each([
    {},
    { production_order_id: 0 },
    { production_order_id: 7, deviation_id: -1 },
    { production_order_id: 7, limit: 21 },
  ])('validates deviation arguments: %j', async (arguments_) => {
    const response = await rpc('tools/call', {
      name: 'get_production_order_deviations',
      arguments: arguments_,
    }).expect(200);
    expect(body(response).result.isError).toBe(true);
    expect(prisma.productionOrderDeviations.findMany).not.toHaveBeenCalled();
  });
});
