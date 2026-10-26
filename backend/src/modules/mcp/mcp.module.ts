import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpToolsService } from './mcp-tools.service';
import { McpOAuthModule } from '../mcp-oauth/oauth.module';
import { FeaturesModule } from '../features/features.module';
import { SapB1ConnectorModule } from '../sap-b1-connector/sap-b1-connector.module';
import { McpWarehouseReleaseService } from './mcp-warehouse-release.service';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';

@Module({
  imports: [McpOAuthModule, FeaturesModule, SapB1ConnectorModule],
  controllers: [McpController],
  providers: [
    McpService,
    McpToolsService,
    McpWarehouseReleaseService,
    PrismaService,
    ProductionOrderLocalCompletenessService,
  ],
})
export class McpModule {}
