import { Module } from '@nestjs/common';
import { ExternalSyncService } from './external-sync.service';
import { ExternalSyncController } from './external-sync.controller';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
@Module({
  controllers: [ExternalSyncController],
  providers: [ExternalSyncService],
  imports: [UsersModule, DepartmentsModule],
  exports: [ExternalSyncService],
})
export class ExternalSyncModule {}
