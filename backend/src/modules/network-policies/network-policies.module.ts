import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesController } from './network-policies.controller';
import { NetworkPoliciesService } from './network-policies.service';

@Module({
  controllers: [NetworkPoliciesController],
  providers: [NetworkPoliciesService, PrismaService],
  exports: [NetworkPoliciesService],
})
export class NetworkPoliciesModule {}
