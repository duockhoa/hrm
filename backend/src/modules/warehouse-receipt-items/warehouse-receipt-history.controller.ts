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
import { WarehouseReceiptReadGuard } from 'src/access/warehouse-receipt-scope';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetAuditLogPageDto } from '../audit-logs/dto/get-audit-log-page.dto';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

@Controller('warehouse-receipt-items')
@UseGuards(jwtAuthGuard, WarehouseReceiptReadGuard)
export class WarehouseReceiptHistoryController {
  constructor(
    private readonly receipts: WarehouseReceiptItemsService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get(':id/history')
  async findHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    page: GetAuditLogPageDto,
  ) {
    // Resolve through the same scoped lookup as detail before accessing audit logs.
    const receipt = await this.receipts.findById(id);
    const attachmentType = 'warehouse_receipt_item_attachments';
    const confirmationType = 'warehouse_receipt_item_sap_confirmations';
    const [historicalAttachments, historicalConfirmations] = await Promise.all([
      this.audit.findHistoricalEntityIds(
        attachmentType,
        'warehouse_receipt_item_id',
        [id],
      ),
      this.audit.findHistoricalEntityIds(
        confirmationType,
        'warehouse_receipt_item_id',
        [id],
      ),
    ]);
    return this.audit.findForEntities(
      [
        { entityType: 'warehouse_receipt_items', ids: [id] },
        {
          entityType: attachmentType,
          ids: [
            ...new Set([
              ...receipt.attachments.map((image) => image.id),
              ...historicalAttachments,
            ]),
          ],
        },
        {
          entityType: confirmationType,
          ids: [
            ...new Set([
              ...(receipt.sapConfirmation ? [receipt.sapConfirmation.id] : []),
              ...historicalConfirmations,
            ]),
          ],
        },
      ],
      page,
    );
  }
}
