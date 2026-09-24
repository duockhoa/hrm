import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PERMISSION_MANAGEMENT_PERMISSIONS } from '../permissions/permissions.permissions';
import { AuditLogsService } from './audit-logs.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Controller('audit-logs')
@UseGuards(jwtAuthGuard, PermissionsGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiTags('Audit logs')
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions(PERMISSION_MANAGEMENT_PERMISSIONS.LIST)
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi có phân trang' })
  findAll(@Query() query: GetAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }
}
