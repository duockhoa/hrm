import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PrismaService } from 'src/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetAuditLogPageDto } from '../audit-logs/dto/get-audit-log-page.dto';
import { ITEM_PERMISSIONS } from './items.permissions';

@Controller('items')
@UseGuards(jwtAuthGuard, PermissionsGuard, NetworkPolicyGuard)
export class ItemHistoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get(':itemCode/history')
  @Permissions(ITEM_PERMISSIONS.READ)
  async findHistory(
    @Param('itemCode') itemCode: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    page: GetAuditLogPageDto,
  ) {
    const item = await this.prisma.items.findUnique({
      where: { item_code: itemCode },
      select: { item_code: true, deleted_at: true },
    });
    if (!item || item.deleted_at)
      throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.audit.findForItem(item.item_code, page);
  }
}
