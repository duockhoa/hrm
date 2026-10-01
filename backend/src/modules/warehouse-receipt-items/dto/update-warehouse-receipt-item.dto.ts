import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseReceiptItemDto } from './create-warehouse-receipt-item.dto';

export class UpdateWarehouseReceiptItemDto extends PartialType(
  CreateWarehouseReceiptItemDto,
) {}
