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
import { CreateSecondaryPackagingStageRequirementDto } from './dto/create-secondary-packaging-stage-requirement.dto';
import { UpdateSecondaryPackagingStageRequirementDto } from './dto/update-secondary-packaging-stage-requirement.dto';
import { SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS } from './secondary-packaging-stage-requirements.permissions';
import { SecondaryPackagingStageRequirementsService } from './secondary-packaging-stage-requirements.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('secondary-packaging-stage-requirements')
export class SecondaryPackagingStageRequirementsController {
  constructor(
    private readonly secondaryPackagingStageRequirementsService: SecondaryPackagingStageRequirementsService,
  ) {}

  @Get()
  @Permissions(SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.LIST)
  async findAll() {
    return this.secondaryPackagingStageRequirementsService.findAll();
  }

  @Get(':id')
  @Permissions(SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.secondaryPackagingStageRequirementsService.findById(id);
  }

  @Post()
  @Permissions(SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.CREATE)
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
  @Permissions(SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSecondaryPackagingStageRequirementDto,
  ) {
    return this.secondaryPackagingStageRequirementsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.secondaryPackagingStageRequirementsService.delete(id);
  }
}
