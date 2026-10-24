import { PartialType } from '@nestjs/swagger';
import { CreateProductionOrderWeighingRecordLineDto } from './create-production-order-weighing-record-line.dto';

export class UpdateProductionOrderWeighingRecordLineDto extends PartialType(
  CreateProductionOrderWeighingRecordLineDto,
) {}
