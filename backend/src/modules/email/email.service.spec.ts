import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { EmailService } from './email.service';
import { DEFAULT_EMAIL_TEXT_BODY } from './constants/email.constants';
import { EmailSettingsService } from '../email-settings/email-settings.service';

jest.mock('axios');

describe('EmailService', () => {
  let service: EmailService;
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const emailSettingsService = { resolveRecipients: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EmailSettingsService, useValue: emailSettingsService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mockedAxios.post.mockReset();
    emailSettingsService.resolveRecipients.mockReset();
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

  it('uses configured recipients when sending an email by type', async () => {
    emailSettingsService.resolveRecipients.mockResolvedValue([
      'qc@example.com',
      'qa@example.com',
    ]);
    mockedAxios.post.mockResolvedValue({ data: { status: 'success' } });

    await service.sendConfiguredEmail('sampling_request', 7, {
      subject: 'Phiếu lấy mẫu',
      message: 'Nội dung',
    });

    expect(emailSettingsService.resolveRecipients).toHaveBeenCalledWith(
      'sampling_request',
      7,
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        recipients: ['qc@example.com', 'qa@example.com'],
      }),
      expect.any(Object),
    );
  });

  it('does not call the provider when recipients cannot be resolved', async () => {
    emailSettingsService.resolveRecipients.mockRejectedValue(
      new Error('Missing email'),
    );
    await expect(
      service.sendConfiguredEmail('sampling_request', 7, {
        subject: 'Test',
        message: 'Hello',
      }),
    ).rejects.toThrow('Missing email');
    expect(mockedAxios.post).not.toHaveBeenCalled();
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
