import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import OAuth2Server from '@node-oauth/oauth2-server';

export const OAUTH_SCOPES = ['mcp:read', 'offline_access'];
export const ACCESS_TOKEN_SECONDS = 900;
export const REFRESH_TOKEN_SECONDS = 30 * 86400;
export const AUTHORIZATION_SECONDS = 300;
export const AUTH_COOKIE = 'dkpharma_oauth_request';
export const invalidTarget = () =>
  new OAuth2Server.OAuthError(
    'The resource must be the configured MCP endpoint.',
    { name: 'invalid_target', code: 400 },
  );

export const tokenHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

@Injectable()
export class OAuthConfig {
  readonly issuer: string;
  readonly resource: string;
  readonly secureCookies: boolean;
  readonly allowedOrigins: string[];

  constructor() {
    const configured = process.env.MCP_OAUTH_ISSUER;
    if (!configured && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Configure MCP_OAUTH_ISSUER with the public HTTPS backend origin.',
      );
    }
    const issuer = new URL(
      configured || `http://localhost:${process.env.PORT || 3012}`,
    );
    if (
      issuer.username ||
      issuer.password ||
      issuer.search ||
      issuer.hash ||
      issuer.pathname !== '/'
    ) {
      throw new Error(
        'MCP_OAUTH_ISSUER must be an origin without credentials, path, query or fragment.',
      );
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(issuer.hostname);
    if (
      issuer.protocol !== 'https:' &&
      !(
        process.env.NODE_ENV !== 'production' &&
        local &&
        issuer.protocol === 'http:'
      )
    ) {
      throw new Error(
        'MCP_OAUTH_ISSUER must use HTTPS outside local development.',
      );
    }
    this.issuer = issuer.origin;
    this.resource = `${this.issuer}/mcp`;
    this.secureCookies = issuer.protocol === 'https:';
    this.allowedOrigins = [
      this.issuer,
      ...(process.env.MCP_OAUTH_ALLOWED_ORIGINS || 'https://gemini.google.com')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ];
  }

  get metadataUrl() {
    return `${this.issuer}/.well-known/oauth-protected-resource/mcp`;
  }

  authorizationMetadata() {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/oauth/authorize`,
      token_endpoint: `${this.issuer}/oauth/token`,
      registration_endpoint: `${this.issuer}/oauth/register`,
      revocation_endpoint: `${this.issuer}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: OAUTH_SCOPES,
      authorization_response_iss_parameter_supported: true,
    };
  }

  resourceMetadata() {
    return {
      resource: this.resource,
      authorization_servers: [this.issuer],
      scopes_supported: ['mcp:read'],
      bearer_methods_supported: ['header'],
      resource_name: 'DKPHARMA APP',
    };
  }
}
