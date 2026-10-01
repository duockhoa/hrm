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
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateWarehouseReceiptItemDto } from './dto/create-warehouse-receipt-item.dto';
import { UpdateWarehouseReceiptItemDto } from './dto/update-warehouse-receipt-item.dto';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

@ApiTags('warehouse-receipt-items')
@UseGuards(jwtAuthGuard)
@Controller('warehouse-receipt-items')
export class WarehouseReceiptItemsController {
  constructor(private readonly service: WarehouseReceiptItemsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(
    @Body() dto: CreateWarehouseReceiptItemDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseReceiptItemDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
