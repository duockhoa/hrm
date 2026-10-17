import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpToolsService } from './mcp-tools.service';
import { McpOAuthModule } from '../mcp-oauth/oauth.module';
import { FeaturesModule } from '../features/features.module';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';

@Module({
  imports: [McpOAuthModule, FeaturesModule],
  controllers: [McpController],
  providers: [
    McpService,
    McpToolsService,
    PrismaService,
    ProductionOrderLocalCompletenessService,
  ],
})
export class McpModule {}
