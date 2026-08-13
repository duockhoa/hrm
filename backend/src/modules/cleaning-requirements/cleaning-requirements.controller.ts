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
import { CleaningRequirementsService } from './cleaning-requirements.service';
import { CreateCleaningRequirementDto } from './dto/create-cleaning-requirement.dto';
import { UpdateCleaningRequirementDto } from './dto/update-cleaning-requirement.dto';

@UseGuards(jwtAuthGuard)
@Controller('cleaning-requirements')
export class CleaningRequirementsController {
  constructor(
    private readonly cleaningRequirementsService: CleaningRequirementsService,
  ) {}

  @Get()
  async findAll() {
    return this.cleaningRequirementsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningRequirementsService.findById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateCleaningRequirementDto,
    @Request() req: any,
  ) {
    return this.cleaningRequirementsService.create(dto, req.user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleaningRequirementDto,
  ) {
    return this.cleaningRequirementsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningRequirementsService.delete(id);
  }
}
