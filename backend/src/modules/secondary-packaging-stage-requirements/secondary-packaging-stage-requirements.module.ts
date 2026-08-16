import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SecondaryPackagingStageRequirementsController } from './secondary-packaging-stage-requirements.controller';
import { SecondaryPackagingStageRequirementsService } from './secondary-packaging-stage-requirements.service';

@Module({
  controllers: [SecondaryPackagingStageRequirementsController],
  providers: [SecondaryPackagingStageRequirementsService, PrismaService],
})
export class SecondaryPackagingStageRequirementsModule {}
