import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesModule } from '../network-policies/network-policies.module';
import { ProductionOrderPdfRendererModule } from '../production-orders/exports/production-order-pdf-renderer.module';
import { UsersModule } from '../users/users.module';
import {
  AppConnectionSessionsController,
  EbrConnectionSessionsController,
} from './app-connection-sessions.controller';
import {
  EbrConnectionSessionsGateway,
  WmsConnectionSessionsGateway,
} from './app-connection-sessions.gateway';
import { AppConnectionSessionsService } from './app-connection-sessions.service';
import { ConnectionHistoryPdfService } from './connection-history-pdf.service';

@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
    NetworkPoliciesModule,
    ProductionOrderPdfRendererModule,
  ],
  controllers: [
    AppConnectionSessionsController,
    EbrConnectionSessionsController,
  ],
  providers: [
    PrismaService,
    AppConnectionSessionsService,
    ConnectionHistoryPdfService,
    EbrConnectionSessionsGateway,
    WmsConnectionSessionsGateway,
  ],
})
export class AppConnectionSessionsModule {}
