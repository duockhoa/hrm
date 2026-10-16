import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import OAuth2Server from '@node-oauth/oauth2-server';
import type { Request, Response } from 'express';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { compare, hashSync } from 'bcrypt';
import * as z from 'zod/v4';
import { PrismaService } from '../../prisma.service';
import {
  OAuthConfig,
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
  AUTHORIZATION_SECONDS,
  AUTH_COOKIE,
  randomToken,
  stringArray,
  tokenHash,
  invalidTarget,
} from './oauth.config';
import { OAuthStore } from './oauth.store';
import { authorizationPage } from './oauth.page';

const permissionInclude = {
  userRoles: {
    include: {
      roles: {
        include: { rolePermissions: { include: { permissions: true } } },
      },
    },
  },
};
const dummyPassword = hashSync(randomToken(), 12);
export interface McpIdentity {
  id: number;
  name: string;
  username: string;
  permissions: string[];
}

@Injectable()
export class OAuthService {
  private readonly authorization: OAuth2Server;
  private readonly tokens: OAuth2Server;
  private readonly failures = new Map<
    string,
    { count: number; expires: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: OAuthStore,
    readonly config: OAuthConfig,
    private readonly jwt: JwtService,
  ) {
    const options = {
      requirePKCE: true,
      authorizationCodeLifetime: AUTHORIZATION_SECONDS,
      accessTokenLifetime: ACCESS_TOKEN_SECONDS,
      refreshTokenLifetime: REFRESH_TOKEN_SECONDS,
      alwaysIssueNewRefreshToken: true,
    };
    this.authorization = new OAuth2Server({
      ...options,
      model: store.model(true),
    });
    this.tokens = new OAuth2Server({
      ...options,
      model: store.model(),
      // The model still requires a secret for every confidential client.
      requireClientAuthentication: {
        authorization_code: false,
        refresh_token: false,
      },
    });
  }

  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) {
      // Identify invalid fields without disclosing their values (passwords,
      // tokens and opaque OAuth state must never appear in diagnostics).
      const fields = result.error.issues
        .slice(0, 10)
        .map((issue) => `${issue.path.join('.') || 'request'} (${issue.code})`);
      throw new OAuth2Server.InvalidRequestError(
        `Tham số OAuth không hợp lệ: ${fields.join(', ')}.`,
      );
    }
    return result.data;
  }

  async beginAuthorization(req: Request, res: Response) {
    const params = this.parse(
      z.object({
        response_type: z.literal('code'),
        client_id: z.string().min(1).max(128),
        redirect_uri: z.url().max(2048),
        resource: z.string().max(512),
        code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        code_challenge_method: z.literal('S256'),
        scope: z.string().max(255).default('mcp:read'),
        // Providers can carry signed/encrypted context in this opaque value.
        // Preserve it verbatim; 1 KiB rejected Gemini's 1,135-character state.
        state: z.string().min(1).max(8192).optional(),
      }),
      req.query,
    );
    if (params.resource !== this.config.resource) throw invalidTarget();
    const client = await this.store.clientForAuthorization(params.client_id);
    if (!client)
      throw new OAuth2Server.InvalidClientError(
        'Ứng dụng chưa được đăng ký hoặc đã bị vô hiệu hóa.',
      );
    if (!stringArray(client.redirectUris).includes(params.redirect_uri))
      throw new OAuth2Server.InvalidRequestError(
        'redirect_uri chưa được đăng ký cho ứng dụng này.',
      );
    const scopes = params.scope.split(' ').filter(Boolean);
    if (!client.grants.includes('authorization_code'))
      throw new OAuth2Server.UnauthorizedClientError(
        'Authorization code is not allowed.',
      );
    if (
      !scopes.includes('mcp:read') ||
      scopes.some((scope) => !stringArray(client.scopes).includes(scope))
    )
      throw new OAuth2Server.InvalidScopeError('Scope không được phép.');
    const requestId = randomToken();
    const csrf = randomToken();
    await this.prisma.oAuthAuthorizationRequests.create({
      data: {
        request_hash: tokenHash(requestId),
        csrf_hash: tokenHash(csrf),
        client_id: client.id,
        params,
        expires_at: new Date(Date.now() + AUTHORIZATION_SECONDS * 1000),
      },
    });
    res.cookie(AUTH_COOKIE, requestId, {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: 'lax',
      path: '/oauth/authorize',
      maxAge: AUTHORIZATION_SECONDS * 1000,
    });
    this.sendPage(
      res,
      String(client.name),
      requestId,
      csrf,
      params.redirect_uri,
    );
  }

  async finishAuthorization(req: Request, res: Response) {
    const form = this.parse(
      z.object({
        request_id: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        csrf: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        decision: z.enum(['allow', 'deny']),
        username: z.string().max(255).optional(),
        password: z.string().max(1024).optional(),
      }),
      req.body,
    );
    const origin = req.get('origin');
    const cookie = (req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${AUTH_COOKIE}=`))
      ?.slice(AUTH_COOKIE.length + 1);
    if ((origin && origin !== this.config.issuer) || cookie !== form.request_id)
      throw new OAuth2Server.InvalidRequestError(
        'Phiên cấp quyền không hợp lệ. Hãy kết nối lại.',
      );
    const pending = await this.prisma.oAuthAuthorizationRequests.findUnique({
      where: { request_hash: tokenHash(form.request_id) },
      include: { client: true },
    });
    if (
      !pending ||
      pending.consumed_at ||
      pending.expires_at <= new Date() ||
      pending.csrf_hash !== tokenHash(form.csrf) ||
      !pending.client.enabled
    )
      throw new OAuth2Server.InvalidRequestError(
        'Phiên cấp quyền đã hết hạn hoặc không hợp lệ.',
      );
    const params = pending.params as Record<string, string>;
    if (
      !stringArray(pending.client.redirect_uris).includes(params.redirect_uri)
    )
      throw new OAuth2Server.InvalidRequestError(
        'Ứng dụng đã thay đổi callback. Hãy kết nối lại.',
      );
    if (form.decision === 'deny') {
      await this.consumeRequest(pending.request_hash);
      const redirect = new URL(params.redirect_uri);
      redirect.searchParams.set('error', 'access_denied');
      if (params.state) redirect.searchParams.set('state', params.state);
      redirect.searchParams.set('iss', this.config.issuer);
      res.clearCookie(AUTH_COOKIE, { path: '/oauth/authorize' });
      res.redirect(302, redirect.href);
      return;
    }
    const attempts = await this.prisma.oAuthAuthorizationRequests.updateMany({
      where: {
        request_hash: pending.request_hash,
        consumed_at: null,
        expires_at: { gt: new Date() },
        attempts: { lt: 5 },
      },
      data: { attempts: { increment: 1 } },
    });
    if (attempts.count !== 1)
      throw new OAuth2Server.AccessDeniedError(
        'Quá số lần đăng nhập. Hãy kết nối lại.',
      );
    const failureKey = tokenHash((form.username || '').toLowerCase());
    this.checkLoginLimit(failureKey);
    const user = form.username
      ? await this.prisma.users.findUnique({
          where: { username: form.username },
        })
      : null;
    const correct = await compare(
      form.password || '',
      user?.password || dummyPassword,
    );
    if (!user || !correct || user.status !== 'active' || user.deleted_at) {
      const failure = this.failures.get(failureKey);
      this.failures.set(failureKey, {
        count: (failure?.count || 0) + 1,
        expires: Date.now() + 600000,
      });
      this.sendPage(
        res,
        pending.client.name,
        form.request_id,
        form.csrf,
        params.redirect_uri,
        'Tên đăng nhập, mật khẩu hoặc trạng thái tài khoản không hợp lệ.',
      );
      return;
    }
    this.failures.delete(failureKey);
    await this.consumeRequest(pending.request_hash);
    // Reuse HRM accounts without creating or exposing an HRM refresh token.
    const oauthRequest = new OAuth2Server.Request({
      method: 'GET',
      headers: req.headers,
      query: params,
      body: {},
    });
    const oauthResponse = new OAuth2Server.Response();
    try {
      await this.authorization.authorize(oauthRequest, oauthResponse, {
        allowEmptyState: true,
        authenticateHandler: { handle: () => ({ id: user.id }) },
      });
    } catch (error) {
      if (!oauthResponse.headers?.location) throw error;
    }
    const redirect = new URL(oauthResponse.headers!.location);
    redirect.searchParams.set('iss', this.config.issuer);
    res.clearCookie(AUTH_COOKIE, { path: '/oauth/authorize' });
    res.redirect(302, redirect.href);
  }

  private checkLoginLimit(key: string) {
    const now = Date.now();
    for (const [entryKey, entry] of this.failures)
      if (entry.expires <= now) this.failures.delete(entryKey);
    if (
      (this.failures.get(key)?.count || 0) >= 10 ||
      this.failures.size >= 10000
    )
      throw new OAuth2Server.AccessDeniedError(
        'Tạm khóa đăng nhập OAuth. Thử lại sau 10 phút.',
      );
  }

  private async consumeRequest(hash: string) {
    const result = await this.prisma.oAuthAuthorizationRequests.updateMany({
      where: {
        request_hash: hash,
        consumed_at: null,
        expires_at: { gt: new Date() },
      },
      data: { consumed_at: new Date() },
    });
    if (result.count !== 1)
      throw new OAuth2Server.InvalidRequestError(
        'Phiên cấp quyền đã được sử dụng.',
      );
  }

  private sendPage(
    res: Response,
    client: string,
    requestId: string,
    csrf: string,
    redirectUri: string,
    error = '',
  ) {
    // Chrome also checks form-action against the POST's redirect target.
    // The URI has already been matched exactly against this client's callbacks.
    const callbackOrigin = new URL(redirectUri).origin;
    const scriptNonce = randomToken();
    res.set({
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      // no-referrer makes browser form navigations send Origin: null.
      // Send only the origin (never OAuth URL parameters) and preserve the
      // real Origin header so same-origin CSRF validation remains effective.
      'Referrer-Policy': 'strict-origin',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-${scriptNonce}'; form-action 'self' ${callbackOrigin}; frame-ancestors 'none'; base-uri 'none'`,
    });
    res
      .status(200)
      .type('html')
      .send(authorizationPage(client, requestId, csrf, error, scriptNonce));
  }

  private async clientFromRequest(req: Request) {
    if (!req.is('application/x-www-form-urlencoded'))
      throw new OAuth2Server.InvalidRequestError(
        'Use application/x-www-form-urlencoded.',
      );
    if (Object.keys(req.query).length)
      throw new OAuth2Server.InvalidRequestError(
        'OAuth credentials must not appear in the URL.',
      );
    const input = this.parse(
      z.record(z.string(), z.string().max(4096)),
      req.body,
    );
    let clientId = input.client_id;
    let secret = input.client_secret;
    const header = req.get('authorization');
    if (header) {
      if (clientId || secret || !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(header))
        throw new OAuth2Server.InvalidClientError(
          'Invalid client authentication.',
        );
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const colon = decoded.indexOf(':');
      if (colon < 1)
        throw new OAuth2Server.InvalidClientError(
          'Invalid client authentication.',
        );
      clientId = decoded.slice(0, colon);
      secret = decoded.slice(colon + 1);
    }
    const client =
      clientId && (await this.store.authenticateClient(clientId, secret));
    if (!client)
      throw new OAuth2Server.InvalidClientError('Invalid client credentials.');
    const method = header
      ? 'client_secret_basic'
      : secret !== undefined
        ? 'client_secret_post'
        : 'none';
    if (
      client.tokenEndpointAuthMethod &&
      client.tokenEndpointAuthMethod !== method
    )
      throw new OAuth2Server.InvalidClientError(
        'Use the registered client authentication method.',
      );
    return { client, input };
  }

  async token(req: Request, res: Response) {
    const { client, input } = await this.clientFromRequest(req);
    if (input.resource !== this.config.resource) throw invalidTarget();
    if (!['authorization_code', 'refresh_token'].includes(input.grant_type))
      throw new OAuth2Server.UnsupportedGrantTypeError(
        'Only authorization_code and refresh_token are supported.',
      );
    if (input.grant_type === 'refresh_token') {
      const saved =
        input.refresh_token &&
        (await this.prisma.oAuthTokens.findUnique({
          where: { refresh_hash: tokenHash(input.refresh_token) },
          include: { grant: true },
        }));
      if (!saved || saved.grant.client_id !== client.id)
        throw new OAuth2Server.InvalidGrantError('Invalid refresh token.');
    }
    const response = new OAuth2Server.Response();
    await this.tokens.token(
      new OAuth2Server.Request({
        method: req.method,
        headers: req.headers,
        query: {},
        body: input,
      }),
      response,
    );
    res
      .set(response.headers || {})
      .status(response.status || 200)
      .json(response.body);
  }

  async revoke(req: Request) {
    const { client, input } = await this.clientFromRequest(req);
    if (!input.token)
      throw new OAuth2Server.InvalidRequestError('Missing token.');
    const hash = tokenHash(input.token);
    const token = await this.prisma.oAuthTokens.findFirst({
      where: {
        OR: [{ access_hash: hash }, { refresh_hash: hash }],
        grant: { client_id: client.id },
      },
    });
    if (token)
      await this.prisma.oAuthGrants.update({
        where: { id: token.grant_id },
        data: { revoked_at: new Date() },
      });
  }

  async resolveMcpToken(
    raw: string,
  ): Promise<{ auth: AuthInfo; user: McpIdentity } | null> {
    const token = await this.store.findAccessToken(raw);
    if (!token) return null;
    const user = await this.identity(token.grant.user_id);
    if (!user) return null;
    return {
      auth: {
        token: raw,
        clientId: token.grant.client_id,
        scopes: stringArray(token.scopes),
        expiresAt: Math.floor(token.access_expires_at.getTime() / 1000),
        resource: new URL(token.grant.resource),
        extra: { userId: user.id, permissions: user.permissions },
      },
      user,
    };
  }

  async identity(id: number): Promise<McpIdentity | null> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: permissionInclude,
    });
    if (!user || user.status !== 'active' || user.deleted_at) return null;
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      permissions: [
        ...new Set(
          user.userRoles
            .filter((role) => !role.roles.deleted_at)
            .flatMap((role) =>
              role.roles.rolePermissions.map(
                (permission) => permission.permissions.name,
              ),
            ),
        ),
      ],
    };
  }

  async resolveHrmSession(raw: string): Promise<McpIdentity> {
    try {
      const payload = this.jwt.verify<{ sub: number; token_use: string }>(raw, {
        secret: process.env.JWT_SECRET,
      });
      if (
        payload.token_use !== 'access' ||
        !Number.isInteger(Number(payload.sub))
      )
        throw new Error('Invalid access token');
      const user = await this.identity(Number(payload.sub));
      if (user) return user;
    } catch {
      /* Return the same response for all invalid credentials. */
    }
    throw new UnauthorizedException('Invalid HRM access token');
  }

  listConnections(userId: number) {
    return this.prisma.oAuthGrants.findMany({
      where: { user_id: userId, revoked_at: null },
      select: {
        id: true,
        resource: true,
        scopes: true,
        created_at: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async revokeConnection(userId: number, grantId: string) {
    await this.prisma.oAuthGrants.updateMany({
      where: { id: grantId, user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
}
