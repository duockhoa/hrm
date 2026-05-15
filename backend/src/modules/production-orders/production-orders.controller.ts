import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProductionOrdersService } from './production-orders.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(jwtAuthGuard)
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Get()
  async findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  async findProductionOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrdersService.findProductionOrderById(id);
  }
  @Get(':id/production-order-lines')
  async findProductionOrderLines(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrdersService.findProductionOrderLines(id);
  }

  @Post(':id/production-order-lines/export')
  async exportProductionOrderLines(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportProductionOrderLines(id);
    const encodedFilename = encodeURIComponent(exportedFile.filename);

    response.set({
      'Content-Disposition': `attachment; filename="${exportedFile.filename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }
}
