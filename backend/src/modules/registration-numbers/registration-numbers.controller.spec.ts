import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { RegistrationNumbersController } from './registration-numbers.controller';
import { REGISTRATION_NUMBER_PERMISSIONS } from './registration-numbers.permissions';
import { RegistrationNumbersService } from './registration-numbers.service';

describe('RegistrationNumbersController', () => {
  let controller: RegistrationNumbersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationNumbersController],
      providers: [{ provide: RegistrationNumbersService, useValue: {} }],
    }).compile();

    controller = module.get<RegistrationNumbersController>(
      RegistrationNumbersController,
    );
  });

  it('declares the list permission', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      REGISTRATION_NUMBER_PERMISSIONS.LIST,
    ]);
  });
});
