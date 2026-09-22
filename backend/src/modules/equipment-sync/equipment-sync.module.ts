import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersSyncModule } from '../registration-numbers-sync/registration-numbers-sync.module';
import { EquipmentSyncService } from './equipment-sync.service';

@Module({
  imports: [RegistrationNumbersSyncModule],
  providers: [EquipmentSyncService, PrismaService],
})
export class EquipmentSyncModule {}
