import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { McpOAuthGuard } from '../mcp-oauth/oauth.guards';

@ApiExcludeController()
@Controller('mcp')
@UseGuards(McpOAuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @All()
  handleRequest(@Req() request: Request, @Res() response: Response) {
    return this.mcpService.handleRequest(request, response);
  }
}
