import { Injectable } from '@nestjs/common';
import OAuth2Server from '@node-oauth/oauth2-server';
import { hash } from 'bcrypt';
import * as z from 'zod/v4';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { OAUTH_SCOPES, randomToken } from './oauth.config';

const invalidMetadata = (message: string, name = 'invalid_client_metadata') =>
  new OAuth2Server.OAuthError(message, { name, code: 400 });

const registration = z.object({
  client_name: z.string().trim().min(1).max(255).default('MCP client'),
  redirect_uris: z.array(z.string().min(1).max(2048)).min(1).max(10),
  token_endpoint_auth_method: z
    .enum(['client_secret_basic', 'client_secret_post', 'none'])
    .default('client_secret_basic'),
  grant_types: z
    .array(z.enum(['authorization_code', 'refresh_token']))
    .min(1)
    .max(2)
    .default(['authorization_code']),
  response_types: z.array(z.literal('code')).length(1).default(['code']),
  scope: z.string().max(255).default('mcp:read'),
});

@Injectable()
export class OAuthRegistrationService {
  // Use the socket peer, never a caller-supplied X-Forwarded-For header.
  // Multi-replica deployments should also enforce a shared limit at the proxy.
  private readonly attempts = new Map<
    string,
    { count: number; expires: number }
  >();
  private window = { count: 0, expires: 0 };
  private inFlight = 0;

  constructor(private readonly prisma: PrismaService) {}

  private limit(req: Request, res: Response) {
    const now = Date.now();
    for (const [key, entry] of this.attempts)
      if (entry.expires <= now) this.attempts.delete(key);
    if (this.window.expires <= now)
      this.window = { count: 0, expires: now + 3600000 };
    const peer = req.socket.remoteAddress || 'unknown';
    const entry = this.attempts.get(peer) || {
      count: 0,
      expires: now + 3600000,
    };
    if (
      entry.count >= 30 ||
      this.window.count >= 500 ||
      this.attempts.size >= 10000 ||
      this.inFlight >= 4
    ) {
      res.set(
        'Retry-After',
        String(
          this.inFlight >= 4
            ? 60
            : Math.max(
                1,
                Math.ceil(
                  (Math.min(entry.expires, this.window.expires) - now) / 1000,
                ),
              ),
        ),
      );
      throw new OAuth2Server.OAuthError(
        'Client registration rate limit exceeded.',
        {
          name: 'temporarily_unavailable',
          code: 429,
        },
      );
    }
    entry.count++;
    this.window.count++;
    this.attempts.set(peer, entry);
  }

  async register(req: Request, res: Response) {
    this.limit(req, res);
    if (
      !req.is('application/json') ||
      Object.keys(req.query).length ||
      Buffer.byteLength(JSON.stringify(req.body) || '') > 16384
    )
      throw invalidMetadata(
        'Send a JSON registration document of at most 16 KiB.',
      );
    const parsed = registration.safeParse(req.body);
    if (!parsed.success)
      throw invalidMetadata('Unsupported or invalid client metadata.');
    const input = parsed.data;
    const redirects = [...new Set(input.redirect_uris)];
    for (const raw of redirects) {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        throw invalidMetadata('Invalid redirect URI.', 'invalid_redirect_uri');
      }
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(
        url.hostname,
      );
      if (
        url.username ||
        url.password ||
        raw.includes('#') ||
        raw.includes('*') ||
        !(url.protocol === 'https:' || (loopback && url.protocol === 'http:'))
      )
        throw invalidMetadata(
          'Redirect URIs must use HTTPS or HTTP loopback, without credentials, wildcards or fragments.',
          'invalid_redirect_uri',
        );
    }
    const grants = [...new Set(input.grant_types)];
    const scopes = [...new Set(input.scope.split(' ').filter(Boolean))];
    if (!grants.includes('authorization_code'))
      throw invalidMetadata('The authorization_code grant is required.');
    if (
      !scopes.includes('mcp:read') ||
      scopes.some((scope) => !OAUTH_SCOPES.includes(scope))
    )
      throw invalidMetadata(
        'Only mcp:read and offline_access scopes are supported.',
      );

    this.inFlight++;
    try {
      const secret =
        input.token_endpoint_auth_method === 'none' ? undefined : randomToken();
      const clientId = `mcp_dcr_${randomToken()}`;
      const saved = await this.prisma.oAuthClients.create({
        data: {
          id: clientId,
          name: input.client_name,
          secret_hash: secret ? await hash(secret, 12) : null,
          token_endpoint_auth_method: input.token_endpoint_auth_method,
          grant_types: grants,
          redirect_uris: redirects,
          scopes,
          enabled: true,
        },
      });
      // RFC 7591: credentials are returned only in this creation response.
      res.status(201).json({
        client_id: clientId,
        client_id_issued_at: Math.floor(saved.created_at.getTime() / 1000),
        ...(secret
          ? { client_secret: secret, client_secret_expires_at: 0 }
          : {}),
        client_name: saved.name,
        redirect_uris: redirects,
        token_endpoint_auth_method: input.token_endpoint_auth_method,
        grant_types: grants,
        response_types: ['code'],
        scope: scopes.join(' '),
      });
    } finally {
      this.inFlight--;
    }
  }
}
