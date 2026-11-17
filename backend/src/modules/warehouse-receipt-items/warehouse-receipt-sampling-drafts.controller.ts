import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseIntPipe,
  Put,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RecordListQueryDto } from '../../common/dto/record-list-query.dto';
import { SaveReceiptSamplingDraftDto } from './dto/save-receipt-sampling-draft.dto';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';
import { WarehouseReceiptSamplingSendService } from './warehouse-receipt-sampling-send.service';
import { SendReceiptSamplingDraftsDto } from './dto/send-receipt-sampling-drafts.dto';

@ApiTags('warehouse-receipt-sampling-drafts')
@UseGuards(jwtAuthGuard)
@Controller()
export class WarehouseReceiptSamplingDraftsController {
  constructor(
    private readonly service: WarehouseReceiptSamplingDraftsService,
    private readonly sendService: WarehouseReceiptSamplingSendService,
  ) {}

  @Get('warehouse-receipt-sampling-drafts')
  findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: RecordListQueryDto = {},
    @Request() req: { user: { id: number | string } },
  ) {
    return this.service.findAll(query, Number(req.user.id));
  }

  @Post('warehouse-receipt-sampling-drafts/send')
  send(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: SendReceiptSamplingDraftsDto,
    @Request() req: { user: { id: number | string } },
  ) {
    return this.sendService.send(dto.requestId, Number(req.user.id));
  }

  @Get('warehouse-receipt-items/:id/sampling-request-draft')
  findByReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string } },
  ) {
    return this.service.findByReceipt(id, Number(req.user.id));
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
    @Request() req: { user: { id: number | string } },
  ) {
    return this.service.save(id, dto, Number(req.user.id));
  }
}
