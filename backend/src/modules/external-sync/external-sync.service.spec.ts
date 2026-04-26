import { Test, TestingModule } from '@nestjs/testing';
import { ExternalSyncService } from './external-sync.service';

describe('ExternalSyncService', () => {
  let service: ExternalSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalSyncService],
    }).compile();

    service = module.get<ExternalSyncService>(ExternalSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
