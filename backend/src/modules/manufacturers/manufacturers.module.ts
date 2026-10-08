import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ManufacturersController } from './manufacturers.controller';
import { ManufacturersService } from './manufacturers.service';

@Module({
  controllers: [ManufacturersController],
  providers: [ManufacturersService, PrismaService],
})
export class ManufacturersModule {}
