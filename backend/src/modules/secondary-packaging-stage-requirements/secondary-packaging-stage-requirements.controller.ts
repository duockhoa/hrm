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
import { CreateSecondaryPackagingStageRequirementDto } from './dto/create-secondary-packaging-stage-requirement.dto';
import { UpdateSecondaryPackagingStageRequirementDto } from './dto/update-secondary-packaging-stage-requirement.dto';
import { SecondaryPackagingStageRequirementsService } from './secondary-packaging-stage-requirements.service';

@UseGuards(jwtAuthGuard)
@Controller('secondary-packaging-stage-requirements')
export class SecondaryPackagingStageRequirementsController {
  constructor(
    private readonly secondaryPackagingStageRequirementsService: SecondaryPackagingStageRequirementsService,
  ) {}

  @Get()
  async findAll() {
    return this.secondaryPackagingStageRequirementsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.secondaryPackagingStageRequirementsService.findById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateSecondaryPackagingStageRequirementDto,
    @Request() req: any,
  ) {
    return this.secondaryPackagingStageRequirementsService.create(
      dto,
      req.user,
    );
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSecondaryPackagingStageRequirementDto,
  ) {
    return this.secondaryPackagingStageRequirementsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.secondaryPackagingStageRequirementsService.delete(id);
  }
}
