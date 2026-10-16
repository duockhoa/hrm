import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { chromium } from 'playwright';
import { PrismaService } from '../../prisma.service';
import { McpModule } from '../mcp/mcp.module';
import { OAuthConfig, tokenHash } from './oauth.config';

type Row = Record<string, unknown>;
function clone<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value))
    return value.map((item: unknown) => clone(item)) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    ) as T;
  return value;
}
type Query = {
  where?: Row;
  data?: Row;
  include?: Row;
  select?: Row;
  orderBy?: unknown;
};
const names = [
  'oAuthClients',
  'oAuthAuthorizationRequests',
  'oAuthGrants',
  'oAuthAuthorizationCodes',
  'oAuthTokens',
  'users',
] as const;
type TableName = (typeof names)[number];

// Exercise the real OAuth library, Nest routes, storage adapter and MCP guard
// without connecting to the developer's production data. CAS updates are atomic.
function memoryDatabase() {
  const rows = Object.fromEntries(names.map((name) => [name, []])) as Record<
    TableName,
    Row[]
  >;
  const relations = (name: TableName, row: Row): Row => {
    if (['oAuthTokens', 'oAuthAuthorizationCodes'].includes(name)) {
      const grant = rows.oAuthGrants.find((item) => item.id === row.grant_id)!;
      return { ...row, grant: relations('oAuthGrants', grant) };
    }
    if (name === 'oAuthGrants')
      return {
        ...row,
        client: rows.oAuthClients.find((item) => item.id === row.client_id),
        user: rows.users.find((item) => item.id === row.user_id),
      };
    if (name === 'oAuthAuthorizationRequests')
      return {
        ...row,
        client: rows.oAuthClients.find((item) => item.id === row.client_id),
      };
    return row;
  };
  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, expected]) => {
      if (key === 'OR')
        return (expected as Row[]).some((condition) => matches(row, condition));
      const actual = row[key];
      if (
        expected &&
        typeof expected === 'object' &&
        !(expected instanceof Date)
      ) {
        const comparison = expected as Row;
        if ('gt' in comparison)
          return actual instanceof Date && actual > (comparison.gt as Date);
        if ('lt' in comparison) return Number(actual) < Number(comparison.lt);
        return (
          actual !== null &&
          typeof actual === 'object' &&
          matches(actual as Row, comparison)
        );
      }
      return actual === expected;
    });
  const selected = (row: Row, select?: Row): Row =>
    select
      ? Object.fromEntries(
          Object.entries(select).map(([key, value]) => [
            key,
            value === true
              ? row[key]
              : selected(row[key] as Row, (value as { select: Row }).select),
          ]),
        )
      : row;
  const tables = Object.fromEntries(
    names.map((name) => [
      name,
      {
        findUnique: jest.fn((query: Query) =>
          Promise.resolve(
            clone(
              rows[name]
                .map((row) => relations(name, row))
                .find((row) => matches(row, query.where)) || null,
            ),
          ),
        ),
        findFirst: jest.fn((query: Query) =>
          Promise.resolve(
            clone(
              rows[name]
                .map((row) => relations(name, row))
                .find((row) => matches(row, query.where)) || null,
            ),
          ),
        ),
        findMany: jest.fn((query: Query) =>
          Promise.resolve(
            clone(
              rows[name]
                .map((row) => relations(name, row))
                .filter((row) => matches(row, query.where))
                .map((row) => selected(row, query.select)),
            ),
          ),
        ),
        create: jest.fn((query: Query) => {
          const data = {
            revoked_at: null,
            consumed_at: null,
            refresh_consumed_at: null,
            attempts: 0,
            created_at: new Date(),
            ...query.data,
          };
          if (name === 'oAuthGrants') {
            const grant = { ...data, id: randomUUID() };
            const nested = (data as Row).codes as { create: Row };
            delete (grant as Row).codes;
            rows[name].push(grant);
            rows.oAuthAuthorizationCodes.push({
              consumed_at: null,
              ...nested.create,
              grant_id: grant.id,
            });
            return Promise.resolve(clone(grant));
          }
          rows[name].push(data);
          return Promise.resolve(clone(data));
        }),
        updateMany: jest.fn((query: Query) => {
          let count = 0;
          for (const row of rows[name])
            if (matches(relations(name, row), query.where)) {
              for (const [key, value] of Object.entries(query.data || {})) {
                row[key] =
                  value && typeof value === 'object' && 'increment' in value
                    ? Number(row[key]) + Number((value as Row).increment)
                    : value;
              }
              count++;
            }
          return Promise.resolve({ count });
        }),
        update: jest.fn((query: Query) => {
          const row = rows[name].find((item) => matches(item, query.where))!;
          Object.assign(row, query.data);
          return Promise.resolve(clone(row));
        }),
      },
    ]),
  ) as Record<TableName, { [method: string]: jest.Mock }>;
  const db = {
    ...tables,
    $transaction: (
      operation: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[],
    ) => (Array.isArray(operation) ? Promise.all(operation) : operation(db)),
  };
  return { db, rows };
}

const issuer = 'http://localhost:3012';
const resource = `${issuer}/mcp`;
const clientId = 'dkpharma-gemini';
const clientSecret = 'test-only-client-secret';
const redirect = 'https://client.example/callback';
const verifier = 'V'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const json = <T>(response: request.Response): T => {
  const value =
    response.type === 'text/event-stream'
      ? response.text
          .split('\n')
          .find((line) => line.startsWith('data: '))!
          .slice(6)
      : response.text;
  return JSON.parse(value) as T;
};
type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

describe('MCP OAuth authorization code + PKCE', () => {
  let app: INestApplication;
  const fixture = memoryDatabase();
  const savedIssuer = process.env.MCP_OAUTH_ISSUER;
  const savedSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.MCP_OAUTH_ISSUER = issuer;
    process.env.JWT_SECRET = 'oauth-integration-test-secret';
    const module = await Test.createTestingModule({ imports: [McpModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.db)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    for (const name of names) fixture.rows[name].length = 0;
    fixture.rows.oAuthClients.push({
      id: clientId,
      name: 'Gemini <test>',
      secret_hash: hashSync(clientSecret, 4),
      redirect_uris: [redirect],
      scopes: ['mcp:read', 'offline_access'],
      enabled: true,
    });
    fixture.rows.users.push({
      id: 1,
      username: 'operator',
      name: 'Operator',
      password: hashSync('hrm-password', 4),
      status: 'active',
      deleted_at: null,
      userRoles: [
        {
          roles: {
            deleted_at: null,
            rolePermissions: [
              { permissions: { name: 'production-orders.list' } },
              { permissions: { name: 'production-orders.read' } },
            ],
          },
        },
      ],
    });
  });
  afterAll(async () => {
    await app.close();
    if (savedIssuer === undefined) delete process.env.MCP_OAUTH_ISSUER;
    else process.env.MCP_OAUTH_ISSUER = savedIssuer;
    if (savedSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedSecret;
  });

  const server = () => app.getHttpServer() as Server;
  const query = () => ({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirect,
    resource,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'mcp:read offline_access',
    state: 'client-state',
  });
  async function start(params = query()) {
    const agent = request.agent(server());
    const response = await agent
      .get('/oauth/authorize')
      .query(params)
      .expect(200);
    const requestId = /name="request_id" value="([^"]+)"/.exec(
      response.text,
    )![1];
    const csrf = /name="csrf" value="([^"]+)"/.exec(response.text)![1];
    return { agent, response, requestId, csrf };
  }
  async function code(params = query()) {
    const flow = await start(params);
    const result = await flow.agent
      .post('/oauth/authorize')
      .set('Origin', issuer)
      .type('form')
      .send({
        request_id: flow.requestId,
        csrf: flow.csrf,
        decision: 'allow',
        username: 'operator',
        password: 'hrm-password',
      })
      .expect(302);
    const location = new URL(String(result.headers.location));
    expect(location.searchParams.get('state')).toBe(params.state);
    expect(location.searchParams.get('iss')).toBe(issuer);
    return location.searchParams.get('code')!;
  }
  function exchange(authCode: string, overrides: Record<string, string> = {}) {
    return request(server())
      .post('/oauth/token')
      .auth(clientId, clientSecret)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: redirect,
        resource,
        code_verifier: verifier,
        ...overrides,
      });
  }
  async function tokens() {
    return json<TokenResponse>(
      await exchange(await code())
        .expect((response) => {
          if (response.status !== 200) throw new Error(response.text);
        })
        .expect(200),
    );
  }
  function mcp(token: string) {
    return request(server())
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', `Bearer ${token}`)
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'get_server_info', arguments: {} },
      });
  }
  function refresh(token: string, secret = clientSecret) {
    return request(server())
      .post('/oauth/token')
      .auth(clientId, secret)
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: token, resource });
  }

  it('publishes resource and authorization metadata with PKCE S256', async () => {
    const metadata = json<{
      resource: string;
      authorization_servers: string[];
    }>(
      await request(server())
        .get('/.well-known/oauth-protected-resource/mcp')
        .expect(200),
    );
    expect(metadata).toMatchObject({
      resource,
      authorization_servers: [issuer],
    });
    expect(
      json<Record<string, unknown>>(
        await request(server())
          .get('/.well-known/oauth-authorization-server')
          .expect(200),
      ),
    ).toMatchObject({
      issuer,
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
    });
    await request(server()).post('/mcp').send({}).expect(401);
  });

  it.each(['client_secret_basic', 'client_secret_post', 'none'])(
    'registers a %s client, completes login, calls MCP, rotates and revokes tokens',
    async (method) => {
      const registered = json<{ client_id: string; client_secret?: string }>(
        await request(server())
          .post('/oauth/register')
          .send({
            client_name: 'Gemini',
            redirect_uris: [redirect],
            token_endpoint_auth_method: method,
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            scope: 'mcp:read offline_access',
          })
          .expect(201),
      );
      const stored = fixture.rows.oAuthClients.find(
        (row) => row.id === registered.client_id,
      )!;
      expect(stored.secret_hash).not.toBe(registered.client_secret);
      if (method === 'none') {
        expect(registered.client_secret).toBeUndefined();
        expect(stored.secret_hash).toBeNull();
      }
      const send = (path: string, body: Record<string, string>) => {
        const req = request(server()).post(path).type('form');
        if (method === 'client_secret_basic')
          req.auth(registered.client_id, registered.client_secret!);
        else {
          body.client_id = registered.client_id;
          if (method === 'client_secret_post')
            body.client_secret = registered.client_secret!;
        }
        return req.send(body);
      };
      const authCode = await code({
        ...query(),
        client_id: registered.client_id,
      });
      const first = json<TokenResponse>(
        await send('/oauth/token', {
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: redirect,
          resource,
          code_verifier: verifier,
        }).expect(200),
      );
      await mcp(first.access_token).expect(200);
      const second = json<TokenResponse>(
        await send('/oauth/token', {
          grant_type: 'refresh_token',
          refresh_token: first.refresh_token,
          resource,
        }).expect(200),
      );
      expect(second.refresh_token).not.toBe(first.refresh_token);
      await send('/oauth/revoke', { token: second.refresh_token }).expect(200);
      await mcp(second.access_token).expect(401);
    },
  );

  it('publishes registration discovery, applies RFC defaults and returns no-store credentials', async () => {
    const metadata = await request(server())
      .get('/.well-known/oauth-authorization-server')
      .expect(200);
    expect(json<Record<string, unknown>>(metadata).registration_endpoint).toBe(
      `${issuer}/oauth/register`,
    );
    const registered = await request(server())
      .post('/oauth/register')
      .send({ redirect_uris: [redirect], ignored_extension: 'ignored' })
      .expect(201);
    expect(registered.headers['cache-control']).toBe('no-store');
    expect(json<Record<string, unknown>>(registered)).toMatchObject({
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'mcp:read',
      client_secret_expires_at: 0,
    });
  });

  it.each([
    { redirect_uris: ['http://evil.example/callback'] },
    { redirect_uris: ['https://user:password@example.com/callback'] },
    { redirect_uris: ['https://example.com/callback#'] },
    { redirect_uris: ['https://*.example.com/callback'] },
    { redirect_uris: ['javascript:alert(1)'] },
    { redirect_uris: [] },
    { scope: 'mcp:read admin' },
    { scope: 'offline_access' },
    { grant_types: ['client_credentials'] },
    { grant_types: ['refresh_token'] },
    { response_types: ['token'] },
    { token_endpoint_auth_method: 'client_secret_jwt' },
    { client_name: 'x'.repeat(256) },
  ])(
    'rejects unsafe or unsupported registration metadata: %j',
    async (overrides) => {
      const response = await request(server())
        .post('/oauth/register')
        .send({ redirect_uris: [redirect], ...overrides })
        .expect(400);
      expect(['invalid_client_metadata', 'invalid_redirect_uri']).toContain(
        json<{ error: string }>(response).error,
      );
      expect(fixture.rows.oAuthClients).toHaveLength(1);
    },
  );

  it('requires JSON and limits the registration document size', async () => {
    await request(server())
      .post('/oauth/register')
      .type('form')
      .send({ redirect_uris: redirect })
      .expect(400);
    await request(server())
      .post('/oauth/register')
      .send({ redirect_uris: [redirect], extension: 'x'.repeat(17000) })
      .expect(400);
  });

  it('identifies invalid authorize fields without echoing sensitive parameter values', async () => {
    const state = 'private-state-marker'.repeat(450);
    const response = await request(server())
      .get('/oauth/authorize')
      .query({ ...query(), state })
      .expect(400);
    const error = json<{ error: string; error_description: string }>(response);
    expect(error.error).toBe('invalid_request');
    expect(error.error_description).toContain('state (too_big)');
    expect(response.text).not.toContain('private-state-marker');
  });

  it.each([1135, 4096])(
    'preserves a provider state of %i characters through consent and token exchange',
    async (length) => {
      const authCode = await code({ ...query(), state: 'G'.repeat(length) });
      await exchange(authCode).expect(200);
    },
  );

  it('does not issue a refresh token unless that grant was registered', async () => {
    const client = json<{ client_id: string }>(
      await request(server())
        .post('/oauth/register')
        .send({ redirect_uris: [redirect], token_endpoint_auth_method: 'none' })
        .expect(201),
    );
    const authCode = await code({
      ...query(),
      scope: 'mcp:read',
      client_id: client.client_id,
    });
    const form = {
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code: authCode,
      redirect_uri: redirect,
      resource,
      code_verifier: verifier,
    };
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({ ...form, client_secret: 'unregistered-secret' })
      .expect(401);
    const response = await request(server())
      .post('/oauth/token')
      .type('form')
      .send(form)
      .expect(200);
    expect(json<TokenResponse>(response).refresh_token).toBeUndefined();
    const saved = fixture.rows.oAuthTokens[0];
    expect(saved.refresh_hash).toBeNull();
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({
        client_id: client.client_id,
        grant_type: 'refresh_token',
        refresh_token: 'nonexistent',
        resource,
      })
      .expect(400);
  });

  it('does not allow a registered public client to bypass PKCE or exact callback binding', async () => {
    const client = json<{ client_id: string }>(
      await request(server())
        .post('/oauth/register')
        .send({ redirect_uris: [redirect], token_endpoint_auth_method: 'none' })
        .expect(201),
    );
    await request(server())
      .get('/oauth/authorize')
      .query({
        ...query(),
        scope: 'mcp:read',
        client_id: client.client_id,
        code_challenge_method: 'plain',
      })
      .expect(400);
    await request(server())
      .get('/oauth/authorize')
      .query({
        ...query(),
        scope: 'mcp:read',
        client_id: client.client_id,
        redirect_uri: `${redirect}/other`,
      })
      .expect(400);
    const authCode = await code({
      ...query(),
      scope: 'mcp:read',
      client_id: client.client_id,
    });
    const form = {
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirect,
      resource,
      client_id: client.client_id,
    };
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send(form)
      .expect(400);
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({ ...form, code_verifier: 'W'.repeat(43) })
      .expect(400);
  });

  it('enforces the registered authentication method without consuming the code', async () => {
    const client = json<{ client_id: string; client_secret: string }>(
      await request(server())
        .post('/oauth/register')
        .send({
          redirect_uris: [redirect],
          token_endpoint_auth_method: 'client_secret_post',
        })
        .expect(201),
    );
    const authCode = await code({
      ...query(),
      scope: 'mcp:read',
      client_id: client.client_id,
    });
    const form = {
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirect,
      resource,
      code_verifier: verifier,
    };
    await request(server())
      .post('/oauth/token')
      .auth(client.client_id, client.client_secret)
      .type('form')
      .send(form)
      .expect(401);
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({ ...form, client_id: client.client_id })
      .expect(401);
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({
        ...form,
        client_id: client.client_id,
        client_secret: client.client_secret,
      })
      .expect(200);
  });

  it('rejects an untrusted browser Origin and accepts the configured client origin', async () => {
    const first = await tokens();
    await mcp(first.access_token)
      .set('Origin', 'https://attacker.example')
      .expect(403);
    await mcp(first.access_token)
      .set('Origin', 'https://gemini.google.com')
      .expect(200);
  });

  it('logs in with HRM, obtains hashed credentials and calls MCP', async () => {
    const result = await tokens();
    expect(result.token_type.toLowerCase()).toBe('bearer');
    expect(result.access_token).toMatch(/^mcp_at_/);
    expect(result.refresh_token).toMatch(/^mcp_rt_/);
    const row = fixture.rows.oAuthTokens[0];
    expect(row.access_hash).toBe(tokenHash(result.access_token));
    expect(row.refresh_hash).toBe(tokenHash(result.refresh_token));
    expect(JSON.stringify(fixture.rows)).not.toContain(result.access_token);
    expect(JSON.stringify(fixture.rows)).not.toContain(result.refresh_token);
    const response = json<{
      result: { structuredContent: { authentication: string } };
    }>(await mcp(result.access_token).expect(200));
    expect(response.result.structuredContent.authentication).toBe('oauth2');
  });

  it('accepts client_secret_post as well as HTTP Basic', async () => {
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: await code(),
        redirect_uri: redirect,
        resource,
        code_verifier: verifier,
      })
      .expect(200);
  });

  it('rejects wrong PKCE and consumes the code', async () => {
    const authCode = await code();
    await exchange(authCode, { code_verifier: 'X'.repeat(43) }).expect(400);
    await exchange(authCode).expect(400);
    expect(fixture.rows.oAuthTokens).toHaveLength(0);
  });

  it('allows an authorization code to be redeemed only once even concurrently', async () => {
    const authCode = await code();
    const results = await Promise.all([exchange(authCode), exchange(authCode)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(fixture.rows.oAuthTokens).toHaveLength(1);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const first = await tokens();
    const second = json<TokenResponse>(
      await refresh(first.refresh_token).expect(200),
    );
    expect(second.refresh_token).not.toBe(first.refresh_token);
    await mcp(second.access_token).expect(200);
    await refresh(first.refresh_token).expect(400);
    await mcp(second.access_token).expect(401);
    await refresh(second.refresh_token).expect(400);
  });

  it('does not revoke a refresh token when client authentication fails', async () => {
    const first = await tokens();
    await refresh(first.refresh_token, 'wrong-secret').expect(401);
    await refresh(first.refresh_token).expect(200);
  });

  it('rejects missing client secret even when PKCE is present', async () => {
    await request(server())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        code: await code(),
        redirect_uri: redirect,
        resource,
        code_verifier: verifier,
      })
      .expect(401);
  });

  it('enforces exact redirects, S256 and allowed scopes before rendering login', async () => {
    await request(server())
      .get('/oauth/authorize')
      .query({ ...query(), redirect_uri: 'https://attacker.example/callback' })
      .expect(400);
    await request(server())
      .get('/oauth/authorize')
      .query({ ...query(), code_challenge_method: 'plain' })
      .expect(400);
    await request(server())
      .get('/oauth/authorize')
      .query({ ...query(), scope: 'mcp:write' })
      .expect(400);
    expect(fixture.rows.oAuthAuthorizationRequests).toHaveLength(0);
  });

  it('requires the correct resource without consuming a valid code', async () => {
    const authCode = await code();
    await exchange(authCode, {
      resource: 'https://another.example/mcp',
    }).expect(400);
    await exchange(authCode).expect(200);
  });

  it('protects consent against CSRF and escapes client names', async () => {
    const flow = await start();
    expect(flow.response.text).toContain('Gemini &lt;test&gt;');
    expect(flow.response.headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(flow.response.headers['content-security-policy']).toContain(
      "form-action 'self' https://client.example;",
    );
    await flow.agent
      .post('/oauth/authorize')
      .type('form')
      .send({
        request_id: flow.requestId,
        csrf: 'Z'.repeat(43),
        decision: 'allow',
        username: 'operator',
        password: 'hrm-password',
      })
      .expect(400);
    await flow.agent
      .post('/oauth/authorize')
      .set('Origin', 'https://attacker.example')
      .type('form')
      .send({ request_id: flow.requestId, csrf: flow.csrf, decision: 'deny' })
      .expect(400);
    await flow.agent
      .post('/oauth/authorize')
      .set('Origin', 'null')
      .type('form')
      .send({ request_id: flow.requestId, csrf: flow.csrf, decision: 'deny' })
      .expect(400);
    expect(fixture.rows.oAuthGrants).toHaveLength(0);
  });

  it('allows denying consent without entering credentials', async () => {
    const flow = await start();
    const response = await flow.agent
      .post('/oauth/authorize')
      .type('form')
      .send({ request_id: flow.requestId, csrf: flow.csrf, decision: 'deny' })
      .expect(302);
    const location = new URL(String(response.headers.location));
    expect(location.searchParams.get('error')).toBe('access_denied');
    expect(location.searchParams.get('state')).toBe('client-state');
    expect(fixture.rows.oAuthGrants).toHaveLength(0);
  });

  it('blocks expired access tokens, locked users, disabled clients and wrong audiences', async () => {
    const first = await tokens();
    const token = fixture.rows.oAuthTokens[0];
    const expiry = token.access_expires_at;
    token.access_expires_at = new Date(0);
    await mcp(first.access_token).expect(401);
    token.access_expires_at = expiry;
    fixture.rows.users[0].status = 'inactive';
    await mcp(first.access_token).expect(401);
    fixture.rows.users[0].status = 'active';
    fixture.rows.oAuthClients[0].enabled = false;
    await mcp(first.access_token).expect(401);
    fixture.rows.oAuthClients[0].enabled = true;
    fixture.rows.oAuthGrants[0].resource = 'https://another.example/mcp';
    await mcp(first.access_token).expect(401);
  });

  it('revokes the grant through the authenticated revocation endpoint', async () => {
    const first = await tokens();
    await request(server())
      .post('/oauth/revoke')
      .auth(clientId, clientSecret)
      .type('form')
      .send({ token: first.refresh_token })
      .expect(200);
    await mcp(first.access_token).expect(401);
    await refresh(first.refresh_token).expect(400);
    await request(server())
      .post('/oauth/revoke')
      .auth(clientId, clientSecret)
      .type('form')
      .send({ token: 'unknown-token' })
      .expect(200);
  });

  it('checks current tool permissions and rejects HRM/query-string credentials at MCP', async () => {
    const first = await tokens();
    fixture.rows.users[0].userRoles = [];
    const response = await request(server())
      .post('/mcp')
      .set('Authorization', `Bearer ${first.access_token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'get_production_order', arguments: { id: 7 } },
      })
      .expect(200);
    expect(
      json<{ result: { isError: boolean } }>(response).result.isError,
    ).toBe(true);
    await request(server())
      .post('/mcp')
      .query({ access_token: first.access_token })
      .send({})
      .expect(401);
    const hrm = new JwtService().sign(
      { sub: 1, token_use: 'access' },
      { secret: process.env.JWT_SECRET, expiresIn: 60 },
    );
    await mcp(hrm).expect(401);
  });

  it('lets only the owning HRM user revoke a connection', async () => {
    const first = await tokens();
    const jwt = new JwtService();
    const access = jwt.sign(
      { sub: 1, token_use: 'access' },
      { secret: process.env.JWT_SECRET, expiresIn: 60 },
    );
    const refreshSession = jwt.sign(
      { sub: 1, token_use: 'refresh' },
      { secret: process.env.JWT_SECRET, expiresIn: 60 },
    );
    await request(server())
      .get('/oauth/connections')
      .set('Authorization', `Bearer ${refreshSession}`)
      .expect(401);
    const connections = json<{ id: string }[]>(
      await request(server())
        .get('/oauth/connections')
        .set('Authorization', `Bearer ${access}`)
        .expect(200),
    );
    expect(connections).toHaveLength(1);
    fixture.rows.users.push({
      ...fixture.rows.users[0],
      id: 2,
      username: 'other-user',
    });
    const other = jwt.sign(
      { sub: 2, token_use: 'access' },
      { secret: process.env.JWT_SECRET, expiresIn: 60 },
    );
    await request(server())
      .delete(`/oauth/connections/${connections[0].id}`)
      .set('Authorization', `Bearer ${other}`)
      .expect(204);
    await mcp(first.access_token).expect(200);
    await request(server())
      .delete(`/oauth/connections/${connections[0].id}`)
      .set('Authorization', `Bearer ${access}`)
      .expect(204);
    await mcp(first.access_token).expect(401);
  });

  it('rejects scope escalation during refresh without consuming the token', async () => {
    const first = await tokens();
    await request(server())
      .post('/oauth/token')
      .auth(clientId, clientSecret)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: first.refresh_token,
        resource,
        scope: 'mcp:write',
      })
      .expect(400);
    await refresh(first.refresh_token).expect(200);
  });

  it('does not accept password or client-credentials grants', async () => {
    for (const grant_type of ['password', 'client_credentials']) {
      await request(server())
        .post('/oauth/token')
        .auth(clientId, clientSecret)
        .type('form')
        .send({
          grant_type,
          resource,
          username: 'operator',
          password: 'hrm-password',
        })
        .expect(400);
    }
    expect(fixture.rows.oAuthTokens).toHaveLength(0);
  });

  it('expires pending consent, authorization codes and refresh tokens', async () => {
    const flow = await start();
    fixture.rows.oAuthAuthorizationRequests[0].expires_at = new Date(0);
    await flow.agent
      .post('/oauth/authorize')
      .type('form')
      .send({ request_id: flow.requestId, csrf: flow.csrf, decision: 'deny' })
      .expect(400);
    const authCode = await code();
    fixture.rows.oAuthAuthorizationCodes[0].expires_at = new Date(0);
    await exchange(authCode).expect(400);
    const first = await tokens();
    fixture.rows.oAuthTokens[0].refresh_expires_at = new Date(0);
    await refresh(first.refresh_token).expect(400);
  });

  it('requires the original browser cookie and limits password attempts', async () => {
    const flow = await start();
    const form = {
      request_id: flow.requestId,
      csrf: flow.csrf,
      decision: 'allow',
      username: 'operator',
      password: 'wrong-password',
    };
    await request(server())
      .post('/oauth/authorize')
      .type('form')
      .send(form)
      .expect(400);
    for (let index = 0; index < 5; index++) {
      const response = await flow.agent
        .post('/oauth/authorize')
        .type('form')
        .send(form)
        .expect(200);
      expect(response.text).toContain(
        'Tên đăng nhập, mật khẩu hoặc trạng thái tài khoản không hợp lệ.',
      );
    }
    await flow.agent
      .post('/oauth/authorize')
      .type('form')
      .send(form)
      .expect(400);
    expect(fixture.rows.oAuthGrants).toHaveLength(0);
  });

  it('does not let another client redeem a code or refresh token', async () => {
    fixture.rows.oAuthClients.push({
      ...fixture.rows.oAuthClients[0],
      id: 'other-client',
    });
    const authCode = await code();
    await request(server())
      .post('/oauth/token')
      .auth('other-client', clientSecret)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: redirect,
        resource,
        code_verifier: verifier,
      })
      .expect(400);
    const first = json<TokenResponse>(await exchange(authCode).expect(200));
    await request(server())
      .post('/oauth/token')
      .auth('other-client', clientSecret)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: first.refresh_token,
        resource,
      })
      .expect(400);
    await refresh(first.refresh_token).expect(200);
  });
  (process.env.MCP_OAUTH_BROWSER_TEST === '1' ? it : it.skip)(
    'submits the browser form with a valid Origin and cookie through the OAuth callback',
    async () => {
      await app.listen(0, '127.0.0.1');
      const address = server().address();
      if (!address || typeof address === 'string')
        throw new Error('Missing test port');
      const base = `http://127.0.0.1:${address.port}`;
      const config = app.get(OAuthConfig);
      const originalIssuer = config.issuer;
      Object.assign(config, { issuer: base });
      const browser = await chromium.launch({
        ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
        headless: true,
      });
      try {
        const page = await browser.newPage();
        await page.route(`${redirect}**`, (route) =>
          route.fulfill({
            contentType: 'text/html',
            body: '<p>OAuth callback received</p>',
          }),
        );
        const initial = await page.goto(
          `${base}/oauth/authorize?${new URLSearchParams(query())}`,
        );
        expect(initial?.status()).toBe(200);
        expect(initial?.headers()['referrer-policy']).toBe('strict-origin');
        await page.getByLabel('Tên đăng nhập HRM').fill('operator');
        await page.getByLabel('Mật khẩu', { exact: true }).fill('hrm-password');
        await page
          .getByRole('button', { name: 'Hiện mật khẩu', exact: true })
          .click();
        expect(
          await page
            .getByLabel('Mật khẩu', { exact: true })
            .getAttribute('type'),
        ).toBe('text');
        await page
          .getByRole('button', { name: 'Ẩn mật khẩu', exact: true })
          .click();
        expect(
          await page
            .getByLabel('Mật khẩu', { exact: true })
            .getAttribute('type'),
        ).toBe('password');
        const [posted] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url() === `${base}/oauth/authorize` &&
              response.request().method() === 'POST',
          ),
          page.getByLabel('Mật khẩu', { exact: true }).press('Enter'),
        ]);
        const headers = await posted.request().allHeaders();
        expect(headers.cookie).toContain('dkpharma_oauth_request=');
        expect(headers.origin).toBe(base);
        expect(headers.referer).toBe(`${base}/`);
        expect(posted.status()).toBe(302);
        await page.waitForURL(`${redirect}**`);
        expect(await page.locator('body').innerText()).toBe(
          'OAuth callback received',
        );
        const callback = new URL(page.url());
        expect(callback.searchParams.get('state')).toBe('client-state');
        expect(callback.searchParams.get('code')).toBeTruthy();
        expect(callback.searchParams.get('error')).toBeNull();
        const issued = json<TokenResponse>(
          await exchange(callback.searchParams.get('code')!).expect(200),
        );
        await mcp(issued.access_token).expect(200);
        await refresh(issued.refresh_token).expect(200);
      } finally {
        Object.assign(config, { issuer: originalIssuer });
        await browser.close();
      }
    },
    30000,
  );
});
