import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';

// Authentication will be added independently of the existing REST guards.
@ApiExcludeController()
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @All()
  handleRequest(@Req() request: Request, @Res() response: Response) {
    return this.mcpService.handleRequest(request, response);
  }
}
