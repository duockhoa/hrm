import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpToolsService } from './mcp-tools.service';
import { McpOAuthModule } from '../mcp-oauth/oauth.module';

@Module({
  imports: [McpOAuthModule],
  controllers: [McpController],
  providers: [McpService, McpToolsService, PrismaService],
})
export class McpModule {}
