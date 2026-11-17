import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PRODUCTION_ORDER_PERMISSIONS } from '../production-orders/production-orders.permissions';
import { RecordListQueryDto } from '../../common/dto/record-list-query.dto';
import { SaveReceiptSamplingDraftDto } from './dto/save-receipt-sampling-draft.dto';
import { SendReceiptSamplingDraftsDto } from './dto/send-receipt-sampling-drafts.dto';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';
import { WarehouseReceiptSamplingSendService } from './warehouse-receipt-sampling-send.service';

type AuthRequest = { user: { id: number | string } };
const validation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Permissions(PRODUCTION_ORDER_PERMISSIONS.SEND_SAMPLING_REQUEST)
@Controller()
export class FinishedProductSamplingDraftsController {
  constructor(
    private readonly drafts: WarehouseReceiptSamplingDraftsService,
    private readonly sender: WarehouseReceiptSamplingSendService,
  ) {}

  @Get('finished-product-sampling-drafts')
  findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: RecordListQueryDto,
    @Request() req: AuthRequest,
  ) {
    return this.drafts.findAll(query, Number(req.user.id), 'TP');
  }
  @Get('production-orders/:id/sampling-request-draft')
  read(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.drafts.findByProductionOrder(id, Number(req.user.id));
  }
  @Put('production-orders/:id/sampling-request-draft')
  save(
    @Param('id', ParseIntPipe) id: number,
    @Body(validation) dto: SaveReceiptSamplingDraftDto,
    @Request() req: AuthRequest,
  ) {
    return this.drafts.saveProductionOrder(id, dto, Number(req.user.id));
  }
  @Post('finished-product-sampling-drafts/send')
  send(
    @Body(validation) dto: SendReceiptSamplingDraftsDto,
    @Request() req: AuthRequest,
  ) {
    return this.sender.send(dto.requestId, Number(req.user.id), 'TP');
  }
}
