import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import OAuth2Server from '@node-oauth/oauth2-server';
import type { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { OAuthConfig } from './oauth.config';
import { HrmOAuthUserGuard } from './oauth.guards';
import type { McpRequest } from './oauth.guards';
import { OAuthRegistrationService } from './oauth-registration.service';

@ApiExcludeController()
@Controller('.well-known')
export class OAuthMetadataController {
  constructor(private readonly config: OAuthConfig) {}

  @Get('oauth-authorization-server')
  authorizationServer(@Res({ passthrough: true }) res: Response) {
    res.set('Cache-Control', 'no-store');
    return this.config.authorizationMetadata();
  }

  @Get(['oauth-protected-resource', 'oauth-protected-resource/mcp'])
  protectedResource(@Res({ passthrough: true }) res: Response) {
    res.set('Cache-Control', 'no-store');
    return this.config.resourceMetadata();
  }
}

@ApiExcludeController()
@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);
  constructor(
    private readonly oauth: OAuthService,
    private readonly registration: OAuthRegistrationService,
  ) {}

  @Post('register')
  register(@Req() req: Request, @Res() res: Response) {
    return this.respond(res, () => this.registration.register(req, res));
  }

  @Get('authorize')
  authorize(@Req() req: Request, @Res() res: Response) {
    return this.respond(res, () => this.oauth.beginAuthorization(req, res));
  }

  @Post('authorize')
  consent(@Req() req: Request, @Res() res: Response) {
    return this.respond(res, () => this.oauth.finishAuthorization(req, res));
  }

  @Post('token')
  token(@Req() req: Request, @Res() res: Response) {
    return this.respond(res, () => this.oauth.token(req, res));
  }

  @Post('revoke')
  revoke(@Req() req: Request, @Res() res: Response) {
    return this.respond(res, async () => {
      await this.oauth.revoke(req);
      res.status(200).json({});
    });
  }

  @Get('connections')
  @UseGuards(HrmOAuthUserGuard)
  connections(@Req() req: McpRequest) {
    return this.oauth.listConnections(req.user!.id);
  }

  @Delete('connections/:id')
  @UseGuards(HrmOAuthUserGuard)
  @HttpCode(204)
  revokeConnection(@Req() req: McpRequest, @Param('id') id: string) {
    return this.oauth.revokeConnection(req.user!.id, id);
  }

  private async respond(res: Response, operation: () => Promise<void>) {
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    try {
      await operation();
    } catch (error) {
      if (res.headersSent) return;
      if (error instanceof OAuth2Server.OAuthError) {
        const status =
          error instanceof OAuth2Server.InvalidClientError ? 401 : error.code;
        if (status >= 500) {
          this.logger.error('OAuth provider failed', error.stack);
          res.status(500).json({
            error: 'server_error',
            error_description: 'Unable to complete OAuth request.',
          });
          return;
        }
        if (status === 401)
          res.set('WWW-Authenticate', 'Basic realm="DKPHARMA OAuth"');
        res
          .status(status)
          .json({ error: error.name, error_description: error.message });
      } else {
        this.logger.error(
          'OAuth request failed',
          error instanceof Error ? error.stack : undefined,
        );
        res.status(500).json({
          error: 'server_error',
          error_description: 'Unable to complete OAuth request.',
        });
      }
    }
  }
}
