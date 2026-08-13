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
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CleaningObjectsService } from './cleaning-objects.service';
import { CreateCleaningObjectDto } from './dto/create-cleaning-object.dto';
import { UpdateCleaningObjectDto } from './dto/update-cleaning-object.dto';

@UseGuards(jwtAuthGuard)
@Controller('cleaning-objects')
export class CleaningObjectsController {
  constructor(private readonly cleaningObjectsService: CleaningObjectsService) {}

  @Get()
  async findAll() {
    return this.cleaningObjectsService.findAll();
  }

  @Get('qr/:qrCode')
  async findByQrCode(@Param('qrCode') qrCode: string) {
    return this.cleaningObjectsService.findByQrCode(qrCode);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningObjectsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateCleaningObjectDto, @Request() req: any) {
    return this.cleaningObjectsService.create(dto, req.user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleaningObjectDto,
  ) {
    return this.cleaningObjectsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningObjectsService.delete(id);
  }
}
