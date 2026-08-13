import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CleaningObjectsController } from './cleaning-objects.controller';
import { CleaningObjectsService } from './cleaning-objects.service';

@Module({
  controllers: [CleaningObjectsController],
  providers: [CleaningObjectsService, PrismaService],
  exports: [CleaningObjectsService],
})
export class CleaningObjectsModule {}
