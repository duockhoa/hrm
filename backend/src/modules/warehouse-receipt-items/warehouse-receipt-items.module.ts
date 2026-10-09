import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';
import { WarehouseReceiptAttachmentsController } from './warehouse-receipt-attachments.controller';
import { WarehouseReceiptAttachmentsService } from './warehouse-receipt-attachments.service';

@Module({
  controllers: [
    WarehouseReceiptAttachmentsController,
    WarehouseReceiptItemsController,
  ],
  providers: [
    WarehouseReceiptItemsService,
    WarehouseReceiptAttachmentsService,
    PrismaService,
  ],
})
export class WarehouseReceiptItemsModule {}
