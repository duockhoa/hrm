import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExternalSyncController } from './external-sync.controller';
import { ExternalSyncService } from './external-sync.service';

describe('ExternalSyncController', () => {
  let controller: ExternalSyncController;
  const eventEmitterMock = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalSyncController],
      providers: [
        ExternalSyncService,
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile();

    controller = module.get<ExternalSyncController>(ExternalSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
