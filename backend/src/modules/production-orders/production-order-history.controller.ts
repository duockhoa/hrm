import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { GetProductionOrderHistoryDto } from './dto/get-production-order-history.dto';
import {
  HistoryUser,
  ProductionOrderHistoryService,
} from './production-order-history.service';

@Controller('production-orders/history')
@UseGuards(jwtAuthGuard, PermissionsGuard, NetworkPolicyGuard)
export class ProductionOrderHistoryController {
  constructor(private readonly history: ProductionOrderHistoryService) {}

  // Exact resource permissions are checked by the service before querying any records/logs.
  @Get(':resource/:recordId')
  findHistory(
    @Param('resource') resource: string,
    @Param('recordId', ParseIntPipe) recordId: number,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    page: GetProductionOrderHistoryDto,
    @Request() request: { user: HistoryUser },
  ) {
    return this.history.findHistory(resource, recordId, page, request.user);
  }
}
