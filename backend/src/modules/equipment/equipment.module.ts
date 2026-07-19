import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentParametersService, PrismaService],
  exports: [EquipmentService, EquipmentParametersService],
})
export class EquipmentModule {}
