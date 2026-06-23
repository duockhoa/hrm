import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { EmailService } from './email.service';
import { DEFAULT_EMAIL_TEXT_BODY } from './constants/email.constants';

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
    process.env.APPS_SCRIPT_EMAIL_API_URL =
      'https://example.com/apps-script-email';
    process.env.EMAIL_SENDER_NAME = 'DKPHARMA APP';
    process.env.APPS_SCRIPT_EMAIL_TIMEOUT_MS = '30000';
  });

  afterEach(() => {
    delete process.env.APPS_SCRIPT_EMAIL_API_URL;
    delete process.env.EMAIL_SENDER_NAME;
    delete process.env.APPS_SCRIPT_EMAIL_TIMEOUT_MS;
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
      'https://example.com/apps-script-email',
      {
        recipients: ['user-a@example.com', 'user-b@example.com'],
        subject: 'Test email',
        message: DEFAULT_EMAIL_TEXT_BODY,
        html: '<p>Hello</p>',
        senderName: 'DKPHARMA APP',
      },
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
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

  it('throws a clear error when the Apps Script email URL is missing', async () => {
    delete process.env.APPS_SCRIPT_EMAIL_API_URL;

    await expect(
      service.sendEmail({
        recipients: 'user@example.com',
        subject: 'Test email',
        message: 'Hello',
      }),
    ).rejects.toMatchObject({
      message: 'APPS_SCRIPT_EMAIL_API_URL is required',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('throws a clear error when the sender name is missing', async () => {
    delete process.env.EMAIL_SENDER_NAME;

    await expect(
      service.sendEmail({
        recipients: 'user@example.com',
        subject: 'Test email',
        message: 'Hello',
      }),
    ).rejects.toMatchObject({
      message: 'EMAIL_SENDER_NAME is required',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('throws a clear error when the email timeout is missing', async () => {
    delete process.env.APPS_SCRIPT_EMAIL_TIMEOUT_MS;

    await expect(
      service.sendEmail({
        recipients: 'user@example.com',
        subject: 'Test email',
        message: 'Hello',
      }),
    ).rejects.toMatchObject({
      message: 'APPS_SCRIPT_EMAIL_TIMEOUT_MS must be a positive number',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
