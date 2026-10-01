import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

@Module({
  controllers: [WarehouseReceiptItemsController],
  providers: [WarehouseReceiptItemsService, PrismaService],
})
export class WarehouseReceiptItemsModule {}
