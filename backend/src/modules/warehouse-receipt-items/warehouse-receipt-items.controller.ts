import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateWarehouseReceiptItemDto } from './dto/create-warehouse-receipt-item.dto';
import { UpdateWarehouseReceiptItemDto } from './dto/update-warehouse-receipt-item.dto';
import { WAREHOUSE_RECEIPT_ITEM_PERMISSIONS as PERMISSIONS } from './warehouse-receipt-items.permissions';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

@ApiTags('warehouse-receipt-items')
@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('warehouse-receipt-items')
export class WarehouseReceiptItemsController {
  constructor(private readonly service: WarehouseReceiptItemsService) {}

  @Get()
  @Permissions(PERMISSIONS.LIST)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.READ)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions(PERMISSIONS.CREATE)
  create(
    @Body() dto: CreateWarehouseReceiptItemDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.UPDATE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseReceiptItemDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.DELETE)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
