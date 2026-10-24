import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductionOrderWeighingRecordDto {
  @ApiPropertyOptional({ maxLength: 50 })
  record_code?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    enum: ['draft', 'in_progress', 'completed', 'cancelled'],
  })
  status?: string;
}
