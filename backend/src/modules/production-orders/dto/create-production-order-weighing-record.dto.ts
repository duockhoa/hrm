import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderWeighingRecordDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;
}
