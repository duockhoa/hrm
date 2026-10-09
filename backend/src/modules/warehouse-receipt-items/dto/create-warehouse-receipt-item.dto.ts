import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseReceiptItemDto {
  @ApiProperty({ maxLength: 191, example: 'NL001' })
  item_code: string;

  @ApiProperty({
    oneOf: [{ type: 'number' }, { type: 'string' }],
    example: '125.5',
    description:
      'Positive quantity, at most 3 decimal places and 999999999.999',
  })
  quantity: number | string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 191,
    nullable: true,
    example: 'kg',
    description: 'Defaults to the selected item unit when omitted',
  })
  unit?: string | null;

  @ApiProperty({ maxLength: 100, example: 'LOT-2026-001' })
  lot_number: string;

  @ApiPropertyOptional({ type: String, maxLength: 100, nullable: true })
  manufacturer_lot_number?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2027-12-31',
  })
  expiry_date?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 255, nullable: true })
  packaging_specification?: string | null;

  @ApiProperty({
    type: String,
    maxLength: 191,
    description: 'CardCode of a SAP business partner with CardType cSupplier',
  })
  supplier_code: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 100,
    nullable: true,
    example: 'NSX0001',
    description: 'Code of a manufacturer in the manufacturers catalog',
  })
  manufacturer_code?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-10-01T08:00:00+07:00',
  })
  received_at?: string;
}
