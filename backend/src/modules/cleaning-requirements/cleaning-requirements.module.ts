import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CleaningRequirementsController } from './cleaning-requirements.controller';
import { CleaningRequirementsService } from './cleaning-requirements.service';

@Module({
  controllers: [CleaningRequirementsController],
  providers: [CleaningRequirementsService, PrismaService],
})
export class CleaningRequirementsModule {}
