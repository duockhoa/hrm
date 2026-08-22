import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UserLoginSessionsController } from './user-login-sessions.controller';
import { UserLoginSessionsService } from './user-login-sessions.service';

@Module({
  controllers: [UserLoginSessionsController],
  providers: [UserLoginSessionsService, PrismaService],
})
export class UserLoginSessionsModule {}
