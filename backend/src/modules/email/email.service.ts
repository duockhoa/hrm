import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import axios, { AxiosError } from 'axios';
import { EventNames } from 'src/event.interface';
import { DEFAULT_EMAIL_TEXT_BODY } from './constants/email.constants';
import { EmailFileDto, SendEmailDto } from './dto/send-email.dto';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import {
  AppsScriptEmailResponse,
  SendEmailResponse,
} from './interfaces/apps-script-email-response.interface';

interface EmailPayload {
  recipients: string[];
  subject: string;
  message: string;
  html: string;
  senderName: string;
  inlineImages?: Record<string, EmailFileDto>;
  attachments?: EmailFileDto[];
}

@Injectable()
export class EmailService {
  constructor(private readonly emailSettingsService: EmailSettingsService) {}

  async sendConfiguredEmail(
    emailTypeCode: string,
    userId: number,
    dto: Omit<SendEmailDto, 'recipients' | 'emailTypeCode'>,
  ): Promise<SendEmailResponse> {
    const recipients = await this.emailSettingsService.resolveRecipients(
      emailTypeCode,
      userId,
    );
    return this.sendEmail({ ...dto, recipients });
  }

  async sendEmail(sendEmailDto: SendEmailDto): Promise<SendEmailResponse> {
    const payload = this.buildPayload(sendEmailDto);

    try {
      const response = await axios.post<AppsScriptEmailResponse>(
        this.emailApiUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.emailTimeoutMs,
        },
      );

      if (response.data?.status === 'error') {
        throw new HttpException(
          response.data.message || 'Email provider returned an error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return {
        status: 'success',
        message: response.data?.message || 'Email sent successfully',
        provider: response.data,
      };
    } catch (error) {
      this.handleEmailApiError(error);
    }
  }

  @OnEvent(EventNames.USER_CREATED)
  handleUserCreatedEvent(payload: any) {
    // Here you can implement the logic to send an email notification
  }

  private buildPayload(sendEmailDto?: SendEmailDto): EmailPayload {
    if (!sendEmailDto) {
      throw new HttpException(
        'Email payload is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const recipients = this.normalizeRecipients(sendEmailDto.recipients);
    const subject =
      typeof sendEmailDto.subject === 'string'
        ? sendEmailDto.subject.trim()
        : '';
    const message =
      typeof sendEmailDto.message === 'string'
        ? sendEmailDto.message.trim()
        : '';
    const html =
      typeof sendEmailDto.html === 'string' ? sendEmailDto.html.trim() : '';

    if (!recipients.length) {
      throw new HttpException(
        'Recipients are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!subject) {
      throw new HttpException('Subject is required', HttpStatus.BAD_REQUEST);
    }

    if (!message && !html) {
      throw new HttpException(
        'Message or html is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const files = this.buildFiles(sendEmailDto);

    return {
      recipients,
      subject,
      message: message || DEFAULT_EMAIL_TEXT_BODY,
      html: html || '',
      senderName: this.emailSenderName,
      ...files,
    };
  }

  private buildFiles(dto: SendEmailDto) {
    const files: Pick<EmailPayload, 'inlineImages' | 'attachments'> = {};
    let totalBytes = 0;
    const normalizeFile = (file: EmailFileDto): EmailFileDto => {
      if (
        !file ||
        typeof file.filename !== 'string' ||
        !file.filename.trim() ||
        /[/\\\r\n]/.test(file.filename) ||
        file.filename.includes('\0') ||
        typeof file.contentType !== 'string' ||
        !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.contentType) ||
        typeof file.contentBase64 !== 'string' ||
        !file.contentBase64 ||
        file.contentBase64.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(file.contentBase64)
      ) {
        throw new HttpException('Invalid email file', HttpStatus.BAD_REQUEST);
      }
      totalBytes += Buffer.byteLength(file.contentBase64, 'base64');
      if (totalBytes > 16 * 1024 * 1024) {
        throw new HttpException(
          'Email files exceed 16 MB',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        filename: file.filename.trim(),
        contentType: file.contentType,
        contentBase64: file.contentBase64,
      };
    };

    if (dto.inlineImages !== undefined) {
      if (
        !dto.inlineImages ||
        typeof dto.inlineImages !== 'object' ||
        Array.isArray(dto.inlineImages)
      ) {
        throw new HttpException(
          'Invalid inline images',
          HttpStatus.BAD_REQUEST,
        );
      }
      files.inlineImages = Object.fromEntries(
        Object.entries(dto.inlineImages).map(([key, file]) => {
          if (
            !/^[a-z][a-z0-9_]*$/i.test(key) ||
            typeof file?.contentType !== 'string' ||
            !file.contentType.startsWith('image/')
          ) {
            throw new HttpException(
              'Invalid inline image',
              HttpStatus.BAD_REQUEST,
            );
          }
          return [key, normalizeFile(file)];
        }),
      );
    }
    if (dto.attachments !== undefined) {
      if (!Array.isArray(dto.attachments)) {
        throw new HttpException('Invalid attachments', HttpStatus.BAD_REQUEST);
      }
      files.attachments = dto.attachments.map(normalizeFile);
    }
    return files;
  }

  private normalizeRecipients(recipients?: string | string[]): string[] {
    if (!recipients) {
      return [];
    }

    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    return recipientList
      .flatMap((recipient) =>
        typeof recipient === 'string' ? recipient.split(',') : [],
      )
      .map((recipient) => recipient.trim())
      .filter(Boolean);
  }

  private get emailApiUrl(): string {
    const apiUrl = process.env.APPS_SCRIPT_EMAIL_API_URL?.trim();

    if (!apiUrl) {
      throw new HttpException(
        'APPS_SCRIPT_EMAIL_API_URL is required',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return apiUrl;
  }

  private get emailTimeoutMs(): number {
    const timeoutValue = process.env.APPS_SCRIPT_EMAIL_TIMEOUT_MS?.trim();
    const timeout = Number(timeoutValue);

    if (!timeoutValue || Number.isNaN(timeout) || timeout <= 0) {
      throw new HttpException(
        'APPS_SCRIPT_EMAIL_TIMEOUT_MS must be a positive number',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return timeout;
  }

  private get emailSenderName(): string {
    const senderName = process.env.EMAIL_SENDER_NAME?.trim();

    if (!senderName) {
      throw new HttpException(
        'EMAIL_SENDER_NAME is required',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return senderName;
  }

  private handleEmailApiError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<AppsScriptEmailResponse>;
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Email API request failed';

      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }

    throw new HttpException(
      'Email API request failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
