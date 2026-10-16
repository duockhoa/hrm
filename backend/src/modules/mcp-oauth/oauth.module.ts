import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { OAuthConfig } from './oauth.config';
import { OAuthStore } from './oauth.store';
import { OAuthService } from './oauth.service';
import { HrmOAuthUserGuard, McpOAuthGuard } from './oauth.guards';
import { OAuthController, OAuthMetadataController } from './oauth.controller';
import { OAuthRegistrationService } from './oauth-registration.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [OAuthController, OAuthMetadataController],
  providers: [
    PrismaService,
    OAuthConfig,
    OAuthStore,
    OAuthService,
    OAuthRegistrationService,
    McpOAuthGuard,
    HrmOAuthUserGuard,
  ],
  exports: [McpOAuthGuard, OAuthService],
})
export class McpOAuthModule {}
