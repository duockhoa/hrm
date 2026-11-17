import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';
import { WarehouseReceiptAttachmentsController } from './warehouse-receipt-attachments.controller';
import { WarehouseReceiptAttachmentsService } from './warehouse-receipt-attachments.service';
import { WarehouseReceiptSamplingDraftsController } from './warehouse-receipt-sampling-drafts.controller';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';
import { WarehouseReceiptSamplingSendService } from './warehouse-receipt-sampling-send.service';
import { EmailSettingsModule } from '../email-settings/email-settings.module';

@Module({
  imports: [EmailSettingsModule],
  controllers: [
    WarehouseReceiptSamplingDraftsController,
    WarehouseReceiptAttachmentsController,
    WarehouseReceiptItemsController,
  ],
  providers: [
    WarehouseReceiptSamplingSendService,
    WarehouseReceiptSamplingDraftsService,
    WarehouseReceiptItemsService,
    WarehouseReceiptAttachmentsService,
    PrismaService,
  ],
})
export class WarehouseReceiptItemsModule {}
