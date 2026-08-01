import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersAuthService } from './registration-numbers-auth.service';

type ScbRegistrationNumberRecord = {
  id?: unknown;
  ma_ho_so?: unknown;
  ten_san_pham?: unknown;
};

@Injectable()
export class RegistrationNumbersSyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly registrationNumbersAuthService: RegistrationNumbersAuthService,
  ) {}

  private readonly logger = new Logger(RegistrationNumbersSyncService.name);

  private getScbRegistrationNumbersApiUrl(): string | null {
    const apiUrl = process.env.SCB_REGISTRATION_NUMBERS_API_URL?.trim();

    return apiUrl || null;
  }

  private getScbRegistrationNumbersLimit(): number {
    const limit = Number(process.env.SCB_REGISTRATION_NUMBERS_LIMIT);

    return Number.isInteger(limit) && limit > 0 ? limit : 5000;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private extractScbRegistrationNumberRecords(
    payload: unknown,
  ): ScbRegistrationNumberRecord[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!this.isObject(payload)) {
      return [];
    }

    const responseData = payload.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }

    if (this.isObject(responseData) && Array.isArray(responseData.data)) {
      return responseData.data;
    }

    return [];
  }

  @Cron(process.env.SCB_REGISTRATION_NUMBERS_SYNC_CRON || '0 */15 * * * *')
  async handleCronSyncRegistrationNumbers() {
    const apiUrl = this.getScbRegistrationNumbersApiUrl();

    if (!apiUrl) {
      this.logger.warn(
        'Skipped SCB registration numbers sync: missing SCB_REGISTRATION_NUMBERS_API_URL',
      );
      return;
    }

    try {
      const response = await this.fetchRegistrationNumbers(apiUrl);

      if (!response) {
        return;
      }

      const registrationNumbers = this.extractScbRegistrationNumberRecords(
        response.data,
      );

      for (const registrationNumber of registrationNumbers) {
        try {
          const id = Number(registrationNumber.id);
          const registration_number =
            typeof registrationNumber.ma_ho_so === 'string'
              ? registrationNumber.ma_ho_so.trim()
              : '';
          const product_name =
            typeof registrationNumber.ten_san_pham === 'string'
              ? registrationNumber.ten_san_pham.trim() || null
              : null;

          if (!Number.isInteger(id) || id <= 0 || !registration_number) {
            this.logger.warn(
              `Skipped SCB registration number with invalid id or ma_ho_so: ${JSON.stringify(
                registrationNumber,
              )}`,
            );
            continue;
          }

          const existingRegistrationNumber =
            await this.prismaService.registrationNumbers.findUnique({
              where: { registration_number },
              select: { id: true },
            });

          if (existingRegistrationNumber) {
            await this.prismaService.registrationNumbers.update({
              where: { registration_number },
              data: {
                id,
                product_name,
                deleted_at: null,
              },
            });
          } else {
            await this.prismaService.registrationNumbers.upsert({
              where: { id },
              update: {
                registration_number,
                product_name,
                deleted_at: null,
              },
              create: {
                id,
                registration_number,
                product_name,
              },
            });
          }
        } catch (registrationNumberError) {
          this.logger.warn(
            `Failed to sync SCB registration number: ${
              registrationNumberError instanceof Error
                ? registrationNumberError.message
                : registrationNumberError
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to fetch/sync SCB registration numbers',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async fetchRegistrationNumbers(apiUrl: string) {
    const token = await this.registrationNumbersAuthService.getAccessToken();

    if (!token) {
      this.logger.warn(
        'Skipped SCB registration numbers sync: unable to get access token',
      );
      return null;
    }

    try {
      return await this.requestRegistrationNumbers(apiUrl, token);
    } catch (error) {
      if (!this.isUnauthorizedError(error)) {
        throw error;
      }

      this.registrationNumbersAuthService.clearAccessToken();
      const refreshedToken =
        await this.registrationNumbersAuthService.getAccessToken(true);

      if (!refreshedToken) {
        this.logger.warn(
          'Skipped SCB registration numbers sync: unable to refresh access token',
        );
        return null;
      }

      return this.requestRegistrationNumbers(apiUrl, refreshedToken);
    }
  }

  private requestRegistrationNumbers(apiUrl: string, token: string) {
    return axios.get(apiUrl, {
      params: {
        limit: this.getScbRegistrationNumbersLimit(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private isUnauthorizedError(error: unknown) {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const responseStatus = (error as { response?: { status?: unknown } })
      .response?.status;

    return responseStatus === 401 || responseStatus === 403;
  }
}
