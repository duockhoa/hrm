import { Test, TestingModule } from '@nestjs/testing';
import { SapB1ConnectorService } from './sap-b1-connector.service';

describe('SapB1ConnectorService', () => {
  let service: SapB1ConnectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SapB1ConnectorService],
    }).compile();

    service = module.get<SapB1ConnectorService>(SapB1ConnectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
