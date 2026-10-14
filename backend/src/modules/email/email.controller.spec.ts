import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

describe('EmailController', () => {
  let controller: EmailController;
  const emailService = { sendEmail: jest.fn(), sendConfiguredEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [{ provide: EmailService, useValue: emailService }],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated actor and configured recipients for a typed email', () => {
    const dto = {
      emailTypeCode: 'sampling_request',
      recipients: 'ignored@example.com',
      subject: 'Test',
      message: 'Hello',
    };
    controller.sendEmail(dto, { user: { id: 7 } });
    expect(emailService.sendConfiguredEmail).toHaveBeenCalledWith(
      'sampling_request',
      7,
      dto,
    );
  });

  it('preserves explicit recipients for emails without a configured type', () => {
    const dto = {
      recipients: 'otp@example.com',
      subject: 'OTP',
      message: 'Hello',
    };
    controller.sendEmail(dto, { user: { id: 7 } });
    expect(emailService.sendEmail).toHaveBeenCalledWith(dto);
  });
});
