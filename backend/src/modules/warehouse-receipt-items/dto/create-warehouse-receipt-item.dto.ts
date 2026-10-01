import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseReceiptItemDto {
  @ApiProperty({ maxLength: 191, example: 'NL001' })
  item_code: string;

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

  @ApiPropertyOptional({ type: String, maxLength: 255, nullable: true })
  supplier_name?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 255, nullable: true })
  manufacturer_name?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-10-01T08:00:00+07:00',
  })
  received_at?: string;
}
