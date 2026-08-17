import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { DosageFormsController } from './dosage-forms.controller';
import { DosageFormsService } from './dosage-forms.service';

@Module({
  controllers: [DosageFormsController],
  providers: [DosageFormsService, PrismaService],
})
export class DosageFormsModule {}
