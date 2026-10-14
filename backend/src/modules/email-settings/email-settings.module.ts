import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EmailSettingsController } from './email-settings.controller';
import { EmailSettingsService } from './email-settings.service';

@Module({
  controllers: [EmailSettingsController],
  providers: [EmailSettingsService, PrismaService],
  exports: [EmailSettingsService],
})
export class EmailSettingsModule {}
