import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderWeighingRecordLineDto {
  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  source_line_number?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  source_stage_id?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255 })
  stage_name?: string | null;

  @ApiProperty({ maxLength: 255 })
  item_code: string;

  @ApiProperty({ maxLength: 255 })
  item_name: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255 })
  lot_no?: string | null;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '12.345678',
    description:
      'Positive Decimal(18,6); prefer a string to preserve precision',
  })
  planned_quantity: string | number;

  @ApiProperty({ maxLength: 50 })
  unit: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;
}
