import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProductionOrdersService } from './production-orders.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import type { ExportProductionOrderLinesDto } from './dto/export-production-order-lines.dto';
import { CreateProductionOrderSamplingRequestDto } from './dto/create-production-order-sampling-request.dto';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';

@UseGuards(jwtAuthGuard)
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly productionOrderSamplingRequestsService: ProductionOrderSamplingRequestsService,
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

  @Get(':id/sampling-requests')
  async findSamplingRequests(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSamplingRequestsService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/sampling-requests')
  async createSamplingRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSamplingRequestDto,
    @Request() req: any,
  ) {
    return this.productionOrderSamplingRequestsService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Post(':id/production-order-lines/export')
  async exportProductionOrderLines(
    @Param('id', ParseIntPipe) id: number,
    @Body() exportOptions: ExportProductionOrderLinesDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportProductionOrderLines(
        id,
        exportOptions,
      );
    const encodedFilename = encodeURIComponent(exportedFile.filename);

    response.set({
      'Content-Disposition': `attachment; filename="${exportedFile.filename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }
}
