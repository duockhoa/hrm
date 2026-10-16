import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { Request, Response } from 'express';
import { OAuthService, McpIdentity } from './oauth.service';

export type McpRequest = Request & { auth?: AuthInfo; user?: McpIdentity };

@Injectable()
export class McpOAuthGuard implements CanActivate {
  constructor(private readonly oauth: OAuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<McpRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const challenge = `Bearer resource_metadata="${this.oauth.config.metadataUrl}", scope="mcp:read"`;
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin && !this.oauth.config.allowedOrigins.includes(origin))
      throw new ForbiddenException('Origin is not allowed for MCP.');
    const authorization = req.get('authorization');
    if (
      req.query.access_token ||
      !authorization ||
      !/^Bearer mcp_at_[A-Za-z0-9_-]{43}$/i.test(authorization)
    ) {
      res.setHeader('WWW-Authenticate', challenge);
      throw new UnauthorizedException({
        error: 'invalid_token',
        error_description: 'An MCP OAuth access token is required.',
      });
    }
    const resolved = await this.oauth.resolveMcpToken(authorization.slice(7));
    if (!resolved) {
      res.setHeader('WWW-Authenticate', challenge);
      throw new UnauthorizedException({
        error: 'invalid_token',
        error_description: 'The access token is invalid, expired or revoked.',
      });
    }
    if (!resolved.auth.scopes.includes('mcp:read')) {
      res.setHeader(
        'WWW-Authenticate',
        `${challenge}, error="insufficient_scope"`,
      );
      throw new ForbiddenException({
        error: 'insufficient_scope',
        error_description: 'The mcp:read scope is required.',
      });
    }
    req.auth = resolved.auth;
    req.user = resolved.user;
    return true;
  }
}

@Injectable()
export class HrmOAuthUserGuard implements CanActivate {
  constructor(private readonly oauth: OAuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<McpRequest>();
    const authorization = req.get('authorization');
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException('HRM access token required');
    req.user = await this.oauth.resolveHrmSession(authorization.slice(7));
    return true;
  }
}
