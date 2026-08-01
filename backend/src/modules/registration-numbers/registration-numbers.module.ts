import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersController } from './registration-numbers.controller';
import { RegistrationNumbersService } from './registration-numbers.service';

@Module({
  controllers: [RegistrationNumbersController],
  providers: [RegistrationNumbersService, PrismaService],
})
export class RegistrationNumbersModule {}
