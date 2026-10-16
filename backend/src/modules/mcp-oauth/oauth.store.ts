import { Injectable } from '@nestjs/common';
import OAuth2Server from '@node-oauth/oauth2-server';
import { compare } from 'bcrypt';
import type { OAuthClients, OAuthGrants } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  OAuthConfig,
  randomToken,
  stringArray,
  tokenHash,
} from './oauth.config';

const grantInclude = {
  client: true,
  user: { select: { id: true, status: true, deleted_at: true } },
};
type OAuthIdentity = { id: number; grantId: string };

@Injectable()
export class OAuthStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: OAuthConfig,
  ) {}

  async clientForAuthorization(
    id: string,
  ): Promise<OAuth2Server.Client | false> {
    const client = await this.prisma.oAuthClients.findUnique({ where: { id } });
    return client?.enabled && client.id === id ? this.client(client) : false;
  }

  async authenticateClient(
    id: string,
    secret?: string,
  ): Promise<OAuth2Server.Client | false> {
    const client = await this.prisma.oAuthClients.findUnique({ where: { id } });
    if (
      !client?.enabled ||
      client.id !== id ||
      (client.token_endpoint_auth_method === 'none'
        ? secret !== undefined || client.secret_hash !== null
        : !secret ||
          !client.secret_hash ||
          !(await compare(secret, client.secret_hash)))
    )
      return false;
    return this.client(client);
  }

  private client(client: OAuthClients): OAuth2Server.Client {
    return {
      id: client.id,
      name: client.name,
      redirectUris: stringArray(client.redirect_uris),
      scopes: stringArray(client.scopes),
      grants:
        client.grant_types == null
          ? ['authorization_code', 'refresh_token']
          : stringArray(client.grant_types),
      tokenEndpointAuthMethod: client.token_endpoint_auth_method,
    };
  }

  private identity(grant: OAuthGrants): OAuthIdentity {
    return { id: grant.user_id, grantId: grant.id };
  }

  private active(
    grant: OAuthGrants & {
      client: OAuthClients;
      user: { status: string; deleted_at: Date | null };
    },
  ) {
    return (
      !grant.revoked_at &&
      grant.client.enabled &&
      grant.user.status === 'active' &&
      !grant.user.deleted_at &&
      grant.resource === this.config.resource &&
      stringArray(grant.scopes).every((scope) =>
        stringArray(grant.client.scopes).includes(scope),
      )
    );
  }

  model(
    forAuthorization = false,
  ): OAuth2Server.AuthorizationCodeModel & OAuth2Server.RefreshTokenModel {
    return {
      getClient: (id, secret) =>
        forAuthorization
          ? this.clientForAuthorization(id)
          : this.authenticateClient(id, secret),
      generateAuthorizationCode: () => Promise.resolve(randomToken()),
      generateAccessToken: () => Promise.resolve(`mcp_at_${randomToken()}`),
      generateRefreshToken: () => Promise.resolve(`mcp_rt_${randomToken()}`),
      validateScope: (_user, client, scopes) => {
        const allowed = stringArray(client.scopes);
        return Promise.resolve(
          scopes?.includes('mcp:read') &&
            scopes.every((scope) => allowed.includes(scope))
            ? scopes
            : false,
        );
      },
      saveAuthorizationCode: async (code, client, user) => {
        const identity = user as { id: number };
        if (!code.codeChallenge || code.codeChallengeMethod !== 'S256')
          throw new OAuth2Server.InvalidRequestError('PKCE S256 is required.');
        const saved = await this.prisma.oAuthGrants.create({
          data: {
            user_id: identity.id,
            client_id: client.id,
            resource: this.config.resource,
            scopes: code.scope || [],
            codes: {
              create: {
                code_hash: tokenHash(code.authorizationCode),
                redirect_uri: code.redirectUri,
                code_challenge: code.codeChallenge,
                expires_at: code.expiresAt,
              },
            },
          },
        });
        return { ...code, client, user: this.identity(saved) };
      },
      getAuthorizationCode: async (raw) => {
        const code = await this.prisma.oAuthAuthorizationCodes.findUnique({
          where: { code_hash: tokenHash(raw) },
          include: { grant: { include: grantInclude } },
        });
        if (
          !code ||
          code.consumed_at ||
          code.expires_at <= new Date() ||
          !this.active(code.grant)
        )
          return false;
        return {
          authorizationCode: raw,
          expiresAt: code.expires_at,
          redirectUri: code.redirect_uri,
          scope: stringArray(code.grant.scopes),
          codeChallenge: code.code_challenge,
          codeChallengeMethod: 'S256',
          client: this.client(code.grant.client),
          user: this.identity(code.grant),
        };
      },
      revokeAuthorizationCode: async (code) => {
        const result = await this.prisma.oAuthAuthorizationCodes.updateMany({
          where: {
            code_hash: tokenHash(code.authorizationCode),
            consumed_at: null,
            expires_at: { gt: new Date() },
          },
          data: { consumed_at: new Date() },
        });
        return result.count === 1;
      },
      saveToken: async (token, client, user) => {
        const issued = token as Pick<
          OAuth2Server.Token,
          | 'accessToken'
          | 'accessTokenExpiresAt'
          | 'refreshToken'
          | 'refreshTokenExpiresAt'
          | 'scope'
        >;
        if (!client.grants.includes('refresh_token')) {
          issued.refreshToken = undefined;
          issued.refreshTokenExpiresAt = undefined;
        }
        const identity = user as OAuthIdentity;
        await this.prisma.$transaction(async (tx) => {
          const grant = await tx.oAuthGrants.findUnique({
            where: { id: identity.grantId },
            include: grantInclude,
          });
          if (
            !grant ||
            !this.active(grant) ||
            grant.client_id !== client.id ||
            grant.user_id !== identity.id
          )
            throw new OAuth2Server.InvalidGrantError(
              'Grant is no longer active.',
            );
          await tx.oAuthTokens.create({
            data: {
              access_hash: tokenHash(issued.accessToken),
              refresh_hash: issued.refreshToken
                ? tokenHash(issued.refreshToken)
                : null,
              grant_id: identity.grantId,
              scopes: issued.scope || [],
              access_expires_at: issued.accessTokenExpiresAt!,
              refresh_expires_at: issued.refreshTokenExpiresAt,
            },
          });
        });
        return { ...issued, client, user };
      },
      getAccessToken: async (raw) => {
        const token = await this.findAccessToken(raw);
        if (!token) return false;
        return {
          accessToken: raw,
          accessTokenExpiresAt: token.access_expires_at,
          scope: stringArray(token.scopes),
          client: this.client(token.grant.client),
          user: this.identity(token.grant),
        };
      },
      getRefreshToken: async (raw) => {
        const token = await this.prisma.oAuthTokens.findUnique({
          where: { refresh_hash: tokenHash(raw) },
          include: { grant: { include: grantInclude } },
        });
        if (!token || !this.active(token.grant)) return false;
        if (token.refresh_consumed_at) {
          await this.prisma.oAuthGrants.update({
            where: { id: token.grant_id },
            data: { revoked_at: new Date() },
          });
          return false;
        }
        if (!token.refresh_expires_at || token.refresh_expires_at <= new Date())
          return false;
        return {
          refreshToken: raw,
          refreshTokenExpiresAt: token.refresh_expires_at,
          scope: stringArray(token.scopes),
          client: this.client(token.grant.client),
          user: this.identity(token.grant),
        };
      },
      revokeToken: async (token) => {
        const result = await this.prisma.oAuthTokens.updateMany({
          where: {
            refresh_hash: tokenHash(token.refreshToken),
            refresh_consumed_at: null,
            refresh_expires_at: { gt: new Date() },
          },
          data: { refresh_consumed_at: new Date() },
        });
        if (result.count !== 1) {
          const identity = token.user as OAuthIdentity;
          await this.prisma.oAuthGrants.updateMany({
            where: { id: identity.grantId },
            data: { revoked_at: new Date() },
          });
        }
        return result.count === 1;
      },
    };
  }

  async findAccessToken(raw: string) {
    if (!/^mcp_at_[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const token = await this.prisma.oAuthTokens.findUnique({
      where: { access_hash: tokenHash(raw) },
      include: { grant: { include: grantInclude } },
    });
    return token &&
      token.access_expires_at > new Date() &&
      this.active(token.grant)
      ? token
      : null;
  }
}
