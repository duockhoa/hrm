import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DataExportApiKeyGuard } from './data-export-api-key.guard';
import { ExportItemsQueryDto } from './dto/export-items.query.dto';
import { DataExportService } from './data-export.service';

@Controller('data-export')
@ApiTags('Data export')
@ApiHeader({
  name: 'x-data-export-api-key',
  required: true,
  description: 'API key dành riêng cho các tiến trình xuất dữ liệu',
})
@UseGuards(DataExportApiKeyGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Get('items')
  @ApiOperation({
    summary: 'Xuất dữ liệu thô của bảng items cho Google Sheets',
  })
  @ApiOkResponse({ description: 'Danh sách items theo trang' })
  @ApiUnauthorizedResponse({ description: 'API key không hợp lệ' })
  @ApiServiceUnavailableResponse({
    description: 'DATA_EXPORT_API_KEY chưa được cấu hình',
  })
  exportItems(@Query() query: ExportItemsQueryDto) {
    return this.dataExportService.exportItems(query);
  }
}
