import { Controller } from '@nestjs/common';
import { ExternalSyncService } from './external-sync.service';

@Controller('external-sync')
export class ExternalSyncController {
  constructor(private readonly externalSyncService: ExternalSyncService) {}
}
