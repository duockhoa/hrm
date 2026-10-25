import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderWeighingRecordDetailDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '12.345678',
    description:
      'Non-zero Decimal(18,6), negative values allowed. Unit comes from the material line; weigher and time come from the server.',
  })
  net_weight: string | number;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;
}
