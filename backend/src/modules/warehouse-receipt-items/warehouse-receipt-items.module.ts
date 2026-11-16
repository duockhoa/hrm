import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';
import { WarehouseReceiptAttachmentsController } from './warehouse-receipt-attachments.controller';
import { WarehouseReceiptAttachmentsService } from './warehouse-receipt-attachments.service';
import { WarehouseReceiptSamplingDraftsController } from './warehouse-receipt-sampling-drafts.controller';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';

@Module({
  controllers: [
    WarehouseReceiptSamplingDraftsController,
    WarehouseReceiptAttachmentsController,
    WarehouseReceiptItemsController,
  ],
  providers: [
    WarehouseReceiptSamplingDraftsService,
    WarehouseReceiptItemsService,
    WarehouseReceiptAttachmentsService,
    PrismaService,
  ],
})
export class WarehouseReceiptItemsModule {}
