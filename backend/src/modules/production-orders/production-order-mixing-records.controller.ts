import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateProductionOrderMixingRecordDto } from './dto/create-production-order-mixing-record.dto';
import { UpdateProductionOrderMixingRecordParameterResultDto } from './dto/update-production-order-mixing-record-parameter-result.dto';
import { ProductionOrderMixingRecordsService } from './production-order-mixing-records.service';

@UseGuards(jwtAuthGuard)
@Controller('production-orders')
export class ProductionOrderMixingRecordsController {
  constructor(
    private readonly productionOrderMixingRecordsService: ProductionOrderMixingRecordsService,
  ) {}

  @Get('mixing-records/:recordId')
  async findById(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.productionOrderMixingRecordsService.findById(recordId);
  }

  @Patch('mixing-record-parameters/:parameterId/result')
  async updateParameterResult(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() dto: UpdateProductionOrderMixingRecordParameterResultDto,
    @Request() req: any,
  ) {
    return this.productionOrderMixingRecordsService.updateParameterResult(
      parameterId,
      dto,
      req.user,
    );
  }

  @Get(':id/mixing-records')
  async findAllByProductionOrder(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderMixingRecordsService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/mixing-records')
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductionOrderMixingRecordDto,
    @Request() req: any,
  ) {
    return this.productionOrderMixingRecordsService.create(id, dto, req.user);
  }
}
