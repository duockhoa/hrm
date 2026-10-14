import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDeviationsController } from './production-order-deviations.controller';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';
import { EmailModule } from '../email/email.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { ProductionOrderDeviationNotificationService } from './production-order-deviation-notification.service';

@Module({
  imports: [EmailModule, EmailSettingsModule],
  controllers: [ProductionOrderDeviationsController],
  providers: [
    ProductionOrderDeviationsService,
    ProductionOrderDeviationNotificationService,
    PrismaService,
  ],
})
export class ProductionOrderDeviationsModule {}
