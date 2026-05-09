import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { EmailService } from './email.service';
import {
  DEFAULT_APPS_SCRIPT_EMAIL_API_URL,
  DEFAULT_EMAIL_SENDER_NAME,
  DEFAULT_EMAIL_TEXT_BODY,
} from './constants/email.constants';

jest.mock('axios');

describe('EmailService', () => {
  let service: EmailService;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mockedAxios.post.mockReset();
    delete process.env.APPS_SCRIPT_EMAIL_API_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sends email through the Apps Script endpoint', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        status: 'success',
        message: 'Email sent',
      },
    });

    const result = await service.sendEmail({
      recipients: 'user-a@example.com, user-b@example.com',
      subject: 'Test email',
      html: '<p>Hello</p>',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      DEFAULT_APPS_SCRIPT_EMAIL_API_URL,
      {
        recipients: ['user-a@example.com', 'user-b@example.com'],
        subject: 'Test email',
        message: DEFAULT_EMAIL_TEXT_BODY,
        html: '<p>Hello</p>',
        senderName: DEFAULT_EMAIL_SENDER_NAME,
      },
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(result).toEqual({
      status: 'success',
      message: 'Email sent',
      provider: {
        status: 'success',
        message: 'Email sent',
      },
    });
  });
});
