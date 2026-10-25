import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderWeighingRecordDetailDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '12.345678',
    description:
      'Positive Decimal(18,6). Unit comes from the material line; weigher and time come from the server.',
  })
  net_weight: string | number;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;
}
