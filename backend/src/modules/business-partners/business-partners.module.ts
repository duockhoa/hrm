import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BusinessPartnersController } from './business-partners.controller';
import { BusinessPartnersService } from './business-partners.service';

@Module({
  controllers: [BusinessPartnersController],
  providers: [BusinessPartnersService, PrismaService],
})
export class BusinessPartnersModule {}
