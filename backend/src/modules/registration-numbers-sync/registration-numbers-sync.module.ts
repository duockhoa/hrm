import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersAuthService } from './registration-numbers-auth.service';
import { RegistrationNumbersSyncService } from './registration-numbers-sync.service';

@Module({
  providers: [
    RegistrationNumbersAuthService,
    RegistrationNumbersSyncService,
    PrismaService,
  ],
})
export class RegistrationNumbersSyncModule {}
