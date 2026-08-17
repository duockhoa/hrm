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
import { CreateDosageFormDto } from './dto/create-dosage-form.dto';
import { UpdateDosageFormDto } from './dto/update-dosage-form.dto';
import { DosageFormsService } from './dosage-forms.service';

@UseGuards(jwtAuthGuard)
@Controller('dosage-forms')
export class DosageFormsController {
  constructor(private readonly dosageFormsService: DosageFormsService) {}

  @Get()
  async findAll() {
    return this.dosageFormsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.dosageFormsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateDosageFormDto, @Request() req: any) {
    return this.dosageFormsService.create(dto, req.user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDosageFormDto,
  ) {
    return this.dosageFormsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.dosageFormsService.delete(id);
  }
}
