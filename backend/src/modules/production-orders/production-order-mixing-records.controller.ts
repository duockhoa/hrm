import {
  Body,
  Controller,
  Delete,
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
import { CreateProductionOrderMixingRecordParameterDto } from './dto/create-production-order-mixing-record-parameter.dto';
import { CreateProductionOrderMixingRecordStageDto } from './dto/create-production-order-mixing-record-stage.dto';
import { CreateProductionOrderMixingRecordStepDto } from './dto/create-production-order-mixing-record-step.dto';
import { UpdateProductionOrderMixingRecordParameterDto } from './dto/update-production-order-mixing-record-parameter.dto';
import { UpdateProductionOrderMixingRecordParameterResultDto } from './dto/update-production-order-mixing-record-parameter-result.dto';
import { UpdateProductionOrderMixingRecordStageDto } from './dto/update-production-order-mixing-record-stage.dto';
import { UpdateProductionOrderMixingRecordStepDto } from './dto/update-production-order-mixing-record-step.dto';
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

  @Delete('mixing-records/:recordId')
  async delete(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.productionOrderMixingRecordsService.delete(recordId);
  }

  @Post('mixing-records/:recordId/stages')
  async createStage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: CreateProductionOrderMixingRecordStageDto,
  ) {
    return this.productionOrderMixingRecordsService.createStage(recordId, dto);
  }

  @Patch('mixing-record-stages/:stageId')
  async updateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: UpdateProductionOrderMixingRecordStageDto,
  ) {
    return this.productionOrderMixingRecordsService.updateStage(stageId, dto);
  }

  @Delete('mixing-record-stages/:stageId')
  async deleteStage(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.productionOrderMixingRecordsService.deleteStage(stageId);
  }

  @Post('mixing-record-stages/:stageId/steps')
  async createStep(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: CreateProductionOrderMixingRecordStepDto,
  ) {
    return this.productionOrderMixingRecordsService.createStep(stageId, dto);
  }

  @Patch('mixing-record-steps/:stepId')
  async updateStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: UpdateProductionOrderMixingRecordStepDto,
  ) {
    return this.productionOrderMixingRecordsService.updateStep(stepId, dto);
  }

  @Delete('mixing-record-steps/:stepId')
  async deleteStep(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.productionOrderMixingRecordsService.deleteStep(stepId);
  }

  @Post('mixing-record-steps/:stepId/parameters')
  async createParameter(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: CreateProductionOrderMixingRecordParameterDto,
  ) {
    return this.productionOrderMixingRecordsService.createParameter(
      stepId,
      dto,
    );
  }

  @Patch('mixing-record-parameters/:parameterId')
  async updateParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() dto: UpdateProductionOrderMixingRecordParameterDto,
  ) {
    return this.productionOrderMixingRecordsService.updateParameter(
      parameterId,
      dto,
    );
  }

  @Delete('mixing-record-parameters/:parameterId')
  async deleteParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
  ) {
    return this.productionOrderMixingRecordsService.deleteParameter(
      parameterId,
    );
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
