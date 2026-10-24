import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderWeighingRecordDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Generated when omitted' })
  record_code?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;
}
