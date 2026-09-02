import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { DataExportApiKeyGuard } from './data-export-api-key.guard';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';

@Module({
  controllers: [DataExportController],
  providers: [DataExportService, DataExportApiKeyGuard, PrismaService],
})
export class DataExportModule {}
