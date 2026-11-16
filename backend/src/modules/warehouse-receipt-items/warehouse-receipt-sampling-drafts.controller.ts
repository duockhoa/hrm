import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RecordListQueryDto } from '../../common/dto/record-list-query.dto';
import { SaveReceiptSamplingDraftDto } from './dto/save-receipt-sampling-draft.dto';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';

@ApiTags('warehouse-receipt-sampling-drafts')
@UseGuards(jwtAuthGuard)
@Controller()
export class WarehouseReceiptSamplingDraftsController {
  constructor(
    private readonly service: WarehouseReceiptSamplingDraftsService,
  ) {}

  @Get('warehouse-receipt-sampling-drafts')
  findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: RecordListQueryDto = {},
  ) {
    return this.service.findAll(query);
  }

  @Get('warehouse-receipt-items/:id/sampling-request-draft')
  findByReceipt(@Param('id', ParseIntPipe) id: number) {
    return this.service.findByReceipt(id);
  }

  @Put('warehouse-receipt-items/:id/sampling-request-draft')
  save(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: SaveReceiptSamplingDraftDto,
  ) {
    return this.service.save(id, dto);
  }
}
