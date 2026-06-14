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
import { CreateProductionOrderEnvironmentCheckDto } from './dto/create-production-order-environment-check.dto';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { CreateProductionOrderFinishedProductSummaryDto } from './dto/create-production-order-finished-product-summary.dto';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { CreateProductionOrderDensityCheckDto } from './dto/create-production-order-density-check.dto';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';

const getAsciiFilenameFallback = (filename: string) => {
  const fallback = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return fallback || 'download.xlsx';
};

const encodeContentDispositionFilename = (filename: string) =>
  encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

@UseGuards(jwtAuthGuard)
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly productionOrderSamplingRequestsService: ProductionOrderSamplingRequestsService,
    private readonly productionOrderEnvironmentChecksService: ProductionOrderEnvironmentChecksService,
    private readonly productionOrderFinishedProductSummariesService: ProductionOrderFinishedProductSummariesService,
    private readonly productionOrderDensityChecksService: ProductionOrderDensityChecksService,
  ) {}

  @Get()
  async findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get('finished-products')
  async findFinishedProducts() {
    return this.productionOrdersService.findFinishedProducts();
  }

  @Get('semi-finished-products')
  async findSemiFinishedProducts() {
    return this.productionOrdersService.findSemiFinishedProducts();
  }

  @Get('finished-product-summaries/:summaryId')
  async findFinishedProductSummaryById(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderFinishedProductSummariesService.findById(
      summaryId,
    );
  }

  @Get('environment-checks/:checkId')
  async findEnvironmentCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderEnvironmentChecksService.findById(checkId);
  }

  @Get('density-checks/:checkId')
  async findDensityCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderDensityChecksService.findById(checkId);
  }

  @Get(':id/export')
  async exportProductionOrder(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportProductionOrder(id);
    const filenameFallback = getAsciiFilenameFallback(exportedFile.filename);
    const encodedFilename = encodeContentDispositionFilename(
      exportedFile.filename,
    );

    response.set({
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
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

  @Get(':id/environment-checks')
  async findEnvironmentChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderEnvironmentChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/environment-checks')
  async createEnvironmentCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderEnvironmentCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderEnvironmentChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/density-checks')
  async findDensityChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDensityChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/density-checks')
  async createDensityCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderDensityCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderDensityChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/finished-product-summaries')
  async findFinishedProductSummaries(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderFinishedProductSummariesService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/finished-product-summaries')
  async createFinishedProductSummary(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderFinishedProductSummaryDto,
    @Request() req: any,
  ) {
    return this.productionOrderFinishedProductSummariesService.create(
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
    const filenameFallback = getAsciiFilenameFallback(exportedFile.filename);
    const encodedFilename = encodeContentDispositionFilename(
      exportedFile.filename,
    );

    response.set({
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }
}
