import { Module } from '@nestjs/common';
import { ExternalSyncService } from './external-sync.service';
import { ExternalSyncController } from './external-sync.controller';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ExternalApiIntegration } from 'src/integrations/external-api.integration';
@Module({
  controllers: [ExternalSyncController],
  providers: [ExternalSyncService, ExternalApiIntegration],
  imports: [UsersModule, DepartmentsModule],
  exports: [ExternalSyncService],
})
export class ExternalSyncModule {}
