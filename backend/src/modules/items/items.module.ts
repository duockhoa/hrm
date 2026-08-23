import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';
import { ItemEquipmentService } from './item-equipment.service';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { MixingActivityTemplateStagesService } from './mixing-activity-template-stages.service';
import { MixingActivityTemplateStageStepsService } from './mixing-activity-template-stage-steps.service';
import { MixingActivityTemplateStageStepParametersService } from './mixing-activity-template-stage-step-parameters.service';

@Module({
  controllers: [ItemsController],
  providers: [
    ItemsService,
    ItemEquipmentService,
    MixingActivityTemplatesService,
    MixingActivityTemplateStagesService,
    MixingActivityTemplateStageStepsService,
    MixingActivityTemplateStageStepParametersService,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
  ],
})
export class ItemsModule {}
