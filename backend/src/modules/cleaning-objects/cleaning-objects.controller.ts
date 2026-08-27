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
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CleaningObjectsService } from './cleaning-objects.service';
import { CreateCleaningObjectDto } from './dto/create-cleaning-object.dto';
import { UpdateCleaningObjectDto } from './dto/update-cleaning-object.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CLEANING_OBJECT_PERMISSIONS } from './cleaning-objects.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('cleaning-objects')
export class CleaningObjectsController {
  constructor(private readonly cleaningObjectsService: CleaningObjectsService) {}

  @Get()
  @Permissions(CLEANING_OBJECT_PERMISSIONS.LIST)
  async findAll() {
    return this.cleaningObjectsService.findAll();
  }

  @Get('qr/:qrCode')
  @Permissions(CLEANING_OBJECT_PERMISSIONS.READ)
  async findByQrCode(@Param('qrCode') qrCode: string) {
    return this.cleaningObjectsService.findByQrCode(qrCode);
  }

  @Get(':id')
  @Permissions(CLEANING_OBJECT_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningObjectsService.findById(id);
  }

  @Post()
  @Permissions(CLEANING_OBJECT_PERMISSIONS.CREATE)
  async create(@Body() dto: CreateCleaningObjectDto, @Request() req: any) {
    return this.cleaningObjectsService.create(dto, req.user);
  }

  @Patch(':id')
  @Permissions(CLEANING_OBJECT_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleaningObjectDto,
  ) {
    return this.cleaningObjectsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(CLEANING_OBJECT_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningObjectsService.delete(id);
  }
}
