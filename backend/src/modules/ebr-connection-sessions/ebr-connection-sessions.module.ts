import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesModule } from '../network-policies/network-policies.module';
import { UsersModule } from '../users/users.module';
import { EbrConnectionSessionsController } from './ebr-connection-sessions.controller';
import { EbrConnectionSessionsGateway } from './ebr-connection-sessions.gateway';
import { EbrConnectionSessionsService } from './ebr-connection-sessions.service';

@Module({
  imports: [JwtModule.register({}), UsersModule, NetworkPoliciesModule],
  controllers: [EbrConnectionSessionsController],
  providers: [
    PrismaService,
    EbrConnectionSessionsService,
    EbrConnectionSessionsGateway,
  ],
})
export class EbrConnectionSessionsModule {}
