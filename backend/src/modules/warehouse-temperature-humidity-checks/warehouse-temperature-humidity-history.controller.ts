import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetAuditLogPageDto } from '../audit-logs/dto/get-audit-log-page.dto';
import { WarehouseTemperatureHumidityChecksService } from './warehouse-temperature-humidity-checks.service';

@Controller('warehouse-temperature-humidity-checks')
@UseGuards(jwtAuthGuard)
export class WarehouseTemperatureHumidityHistoryController {
  constructor(
    private readonly checks: WarehouseTemperatureHumidityChecksService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get(':id/history')
  async findHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    page: GetAuditLogPageDto,
  ) {
    await this.checks.findById(id);
    return this.audit.findAll({
      entity_type: 'warehouse_temperature_humidity_checks',
      entity_id: String(id),
      page: page.page,
      limit: page.limit,
    });
  }
}
