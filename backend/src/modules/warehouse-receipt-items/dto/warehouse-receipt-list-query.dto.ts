import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  RecordListQueryDto,
  trimQueryText,
} from '../../../common/dto/record-list-query.dto';
import { RECEIPT_COUNTING_METHODS } from './create-warehouse-receipt-item.dto';

export class WarehouseReceiptListQueryDto extends RecordListQueryDto {
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  item_name?: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(100)
  lot_number?: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(100)
  manufacturer_lot_number?: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  unit?: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(255)
  supplier?: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  entered_by?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  expiry_from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  expiry_to?: string;

  @IsOptional()
  @Matches(/^\d{1,9}(?:\.\d{1,3})?$/)
  quantity_min?: string;

  @IsOptional()
  @Matches(/^\d{1,9}(?:\.\d{1,3})?$/)
  quantity_max?: string;

  @IsOptional()
  @Matches(/^\d{1,9}(?:\.\d{1,3})?$/)
  actual_quantity_min?: string;

  @IsOptional()
  @Matches(/^\d{1,9}(?:\.\d{1,3})?$/)
  actual_quantity_max?: string;

  @IsOptional()
  @IsIn(RECEIPT_COUNTING_METHODS)
  counting_method?: string;

  @IsOptional()
  @IsIn(['pass', 'fail', 'unrecorded'])
  sensory_status?: string;

  @IsOptional()
  @IsIn(['has', 'missing'])
  dispatch_note_status?: string;

  @IsOptional()
  @IsIn(['has', 'missing'])
  coa_status?: string;

  @IsOptional()
  @IsIn(['has', 'missing'])
  invoice_status?: string;

  @IsOptional()
  @IsIn(['has', 'missing'])
  original_label_status?: string;

  @IsOptional()
  @IsIn(['sent', 'not_sent'])
  sampling_status?: string;

  @IsOptional()
  @IsIn(['entered', 'not_entered'])
  sap_status?: string;
}
