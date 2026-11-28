import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesModule } from '../network-policies/network-policies.module';
import {
  VerificationRecordsWmsGuard,
  WarehouseVerificationRecordsController,
} from './warehouse-verification-records.controller';
import { WarehouseVerificationRecordsService } from './warehouse-verification-records.service';

@Module({
  imports: [NetworkPoliciesModule],
  controllers: [WarehouseVerificationRecordsController],
  providers: [
    WarehouseVerificationRecordsService,
    VerificationRecordsWmsGuard,
    PrismaService,
  ],
})
export class WarehouseVerificationRecordsModule {}
