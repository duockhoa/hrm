import { Module } from '@nestjs/common';
import { ExternalSyncService } from './external-sync.service';
import { ExternalSyncController } from './external-sync.controller';

@Module({
  controllers: [ExternalSyncController],
  providers: [ExternalSyncService],
})
export class ExternalSyncModule {}
