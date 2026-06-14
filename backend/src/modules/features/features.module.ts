import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

@Module({
  controllers: [FeaturesController],
  providers: [FeaturesService, PrismaService],
})
export class FeaturesModule {}
