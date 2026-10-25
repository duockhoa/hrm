import { PartialType } from '@nestjs/swagger';
import { CreateProductionOrderWeighingRecordDetailDto } from './create-production-order-weighing-record-detail.dto';

export class UpdateProductionOrderWeighingRecordDetailDto extends PartialType(
  CreateProductionOrderWeighingRecordDetailDto,
) {}
