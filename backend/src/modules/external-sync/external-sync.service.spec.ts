import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExternalSyncService } from './external-sync.service';

describe('ExternalSyncService', () => {
  let service: ExternalSyncService;
  const eventEmitterMock = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalSyncService,
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile();

    service = module.get<ExternalSyncService>(ExternalSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
