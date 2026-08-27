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
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateDosageFormDto } from './dto/create-dosage-form.dto';
import { UpdateDosageFormDto } from './dto/update-dosage-form.dto';
import { DosageFormsService } from './dosage-forms.service';
import { DOSAGE_FORM_PERMISSIONS } from './dosage-forms.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('dosage-forms')
export class DosageFormsController {
  constructor(private readonly dosageFormsService: DosageFormsService) {}

  @Get()
  @Permissions(DOSAGE_FORM_PERMISSIONS.LIST)
  async findAll() {
    return this.dosageFormsService.findAll();
  }

  @Get(':id')
  @Permissions(DOSAGE_FORM_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.dosageFormsService.findById(id);
  }

  @Post()
  @Permissions(DOSAGE_FORM_PERMISSIONS.CREATE)
  async create(@Body() dto: CreateDosageFormDto, @Request() req: any) {
    return this.dosageFormsService.create(dto, req.user);
  }

  @Patch(':id')
  @Permissions(DOSAGE_FORM_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDosageFormDto,
  ) {
    return this.dosageFormsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(DOSAGE_FORM_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.dosageFormsService.delete(id);
  }
}
