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
import { ExportFinishedProductSummariesQueryDto } from './dto/export-finished-product-summaries.query.dto';
import { ExportItemsQueryDto } from './dto/export-items.query.dto';
import { ExportPostSecondaryPackagingSummariesQueryDto } from './dto/export-post-secondary-packaging-summaries.query.dto';
import { ExportSemiFinishedProductSummariesQueryDto } from './dto/export-semi-finished-product-summaries.query.dto';
import { ExportSemiFinishedWeightChecksQueryDto } from './dto/export-semi-finished-weight-checks.query.dto';
import { ExportVolumeChecksQueryDto } from './dto/export-volume-checks.query.dto';
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

  @Get('finished-product-summaries')
  @ApiOperation({
    summary: 'Xuất dữ liệu tổng kết thành phẩm cho Google Sheets',
  })
  @ApiOkResponse({ description: 'Danh sách tổng kết thành phẩm theo trang' })
  @ApiUnauthorizedResponse({ description: 'API key không hợp lệ' })
  exportFinishedProductSummaries(
    @Query() query: ExportFinishedProductSummariesQueryDto,
  ) {
    return this.dataExportService.exportFinishedProductSummaries(query);
  }

  @Get('post-secondary-packaging-summaries')
  @ApiOperation({
    summary: 'Xuất dữ liệu tổng kết sau đóng gói thứ cấp cho Google Sheets',
  })
  @ApiOkResponse({
    description: 'Danh sách tổng kết sau đóng gói thứ cấp theo trang',
  })
  @ApiUnauthorizedResponse({ description: 'API key không hợp lệ' })
  exportPostSecondaryPackagingSummaries(
    @Query() query: ExportPostSecondaryPackagingSummariesQueryDto,
  ) {
    return this.dataExportService.exportPostSecondaryPackagingSummaries(query);
  }

  @Get('volume-checks')
  @ApiOperation({
    summary: 'Xuất dữ liệu kiểm tra thể tích cho Google Sheets',
  })
  @ApiOkResponse({ description: 'Danh sách kiểm tra thể tích theo trang' })
  @ApiUnauthorizedResponse({ description: 'API key không hợp lệ' })
  exportVolumeChecks(@Query() query: ExportVolumeChecksQueryDto) {
    return this.dataExportService.exportVolumeChecks(query);
  }

  @Get('semi-finished-product-summaries')
  @ApiOperation({
    summary: 'Xuất dữ liệu tổng kết bán thành phẩm cho Google Sheets',
  })
  @ApiOkResponse({ description: 'Danh sách tổng kết bán thành phẩm theo trang' })
  @ApiUnauthorizedResponse({ description: 'API key không hợp lệ' })
  exportSemiFinishedProductSummaries(
    @Query() query: ExportSemiFinishedProductSummariesQueryDto,
  ) {
    return this.dataExportService.exportSemiFinishedProductSummaries(query);
  }

  @Get('semi-finished-weight-checks')
  @ApiOperation({
    summary: 'Xuất dữ liệu kiểm tra khối lượng tịnh và gross cho Google Sheets',
  })
  @ApiOkResponse({
    description: 'Danh sách kiểm tra khối lượng tịnh và gross theo trang',
  })
  @ApiUnauthorizedResponse({ description: 'API key không hợp lệ' })
  exportSemiFinishedWeightChecks(
    @Query() query: ExportSemiFinishedWeightChecksQueryDto,
  ) {
    return this.dataExportService.exportSemiFinishedWeightChecks(query);
  }
}
