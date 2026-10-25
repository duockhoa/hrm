import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';
import { ProductionOrderWeighingStageImportService } from './production-order-weighing-stage-import.service';

class ImportWeighingStageDto {
  @ApiProperty({ minimum: 0 })
  stage_id: number;
}

class ImportWeighingLinesDto {
  @ApiProperty({ type: [Number] })
  line_numbers: number[];
}

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-orders/weighing-records/:recordId')
export class ProductionOrderWeighingStageImportController {
  constructor(
    private readonly service: ProductionOrderWeighingStageImportService,
  ) {}

  @Get('stages')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  stages(@Param('recordId', ParseIntPipe) id: number) {
    return this.service.stages(id);
  }

  @Get('source-materials')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  sourceMaterials(@Param('recordId', ParseIntPipe) id: number) {
    return this.service.sourceMaterials(id);
  }

  @Post('import-lines')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  importLines(
    @Param('recordId', ParseIntPipe) id: number,
    @Body() dto: ImportWeighingLinesDto,
  ) {
    return this.service.importLines(id, dto);
  }

  @Post('import-stage')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  importStage(
    @Param('recordId', ParseIntPipe) id: number,
    @Body() dto: ImportWeighingStageDto,
  ) {
    return this.service.importStage(id, dto);
  }
}
