import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersAuthService } from '../registration-numbers-sync/registration-numbers-auth.service';

type QltbEquipmentRecord = {
  code?: unknown;
  name?: unknown;
};

type EquipmentForSync = {
  code: string;
  name: string;
};

const EQUIPMENT_CODE_MAX_LENGTH = 100;
const EQUIPMENT_NAME_MAX_LENGTH = 255;
const DEFAULT_EQUIPMENT_API_URL =
  'https://qltb.dkpharma.io.vn/api/v1/equipment';

@Injectable()
export class EquipmentSyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly registrationNumbersAuthService: RegistrationNumbersAuthService,
  ) {}

  private readonly logger = new Logger(EquipmentSyncService.name);

  private getEquipmentApiUrl() {
    return (
      process.env.QLTB_EQUIPMENT_API_URL?.trim() || DEFAULT_EQUIPMENT_API_URL
    );
  }

  private getEquipmentSyncLimit() {
    const limit = Number(process.env.QLTB_EQUIPMENT_SYNC_LIMIT);

    return Number.isInteger(limit) && limit > 0 ? limit : 10000;
  }

  private getCreatedById() {
    const userId = Number(process.env.QLTB_EQUIPMENT_SYNC_CREATED_BY_ID);

    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  @Cron(process.env.QLTB_EQUIPMENT_SYNC_CRON || '0 */30 * * * *')
  async handleCronSyncEquipment() {
    try {
      const response = await this.fetchEquipment();

      if (!response) {
        return;
      }

      const records = this.extractEquipmentRecords(response.data);

      if (!records) {
        this.logger.error(
          'Skipped QLTB equipment sync: API response does not contain an equipment list',
        );
        return;
      }

      const equipmentByCode = this.normalizeEquipmentRecords(records);

      if (records.length > 0 && equipmentByCode.size === 0) {
        this.logger.error(
          'Skipped QLTB equipment sync: API response contains no valid equipment codes',
        );
        return;
      }

      const limit = this.getEquipmentSyncLimit();
      if (!this.isCompleteSnapshot(response.data, records.length, limit)) {
        this.logger.warn(
          'Skipped QLTB equipment sync: API response may be incomplete; refusing to remove local equipment',
        );
        return;
      }

      const existingEquipment = await this.prismaService.equipment.findMany({
        select: {
          id: true,
          code: true,
          name: true,
        },
      });
      const existingEquipmentByCode = new Map(
        existingEquipment.map((equipment) => [equipment.code, equipment]),
      );
      const equipmentToCreate: EquipmentForSync[] = [];
      const equipmentToUpdate: Array<{ id: number; name: string }> = [];

      for (const equipment of equipmentByCode.values()) {
        const existing = existingEquipmentByCode.get(equipment.code);

        if (!existing) {
          equipmentToCreate.push(equipment);
          continue;
        }

        if (existing.name !== equipment.name) {
          equipmentToUpdate.push({ id: existing.id, name: equipment.name });
        }
      }

      const codesToDelete = existingEquipment
        .filter((equipment) => !equipmentByCode.has(equipment.code))
        .map((equipment) => equipment.code);

      const createdById =
        equipmentToCreate.length > 0 ? this.getCreatedById() : null;
      if (equipmentToCreate.length > 0 && !createdById) {
        this.logger.error(
          'Skipped QLTB equipment sync: missing QLTB_EQUIPMENT_SYNC_CREATED_BY_ID for new equipment',
        );
        return;
      }

      await this.prismaService.$transaction(async (transaction) => {
        for (const equipment of equipmentToCreate) {
          await transaction.equipment.create({
            data: {
              code: equipment.code,
              name: equipment.name,
              created_by_id: createdById!,
            },
          });
        }

        for (const equipment of equipmentToUpdate) {
          await transaction.equipment.update({
            where: { id: equipment.id },
            data: { name: equipment.name },
          });
        }

        if (codesToDelete.length > 0) {
          await transaction.equipment.deleteMany({
            where: {
              code: { in: codesToDelete },
            },
          });
        }
      });

      this.logger.log(
        `QLTB equipment sync completed: created ${equipmentToCreate.length}, updated ${equipmentToUpdate.length}, deleted ${codesToDelete.length}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to fetch/sync QLTB equipment',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async fetchEquipment() {
    const token = await this.registrationNumbersAuthService.getAccessToken();

    if (!token) {
      this.logger.warn(
        'Skipped QLTB equipment sync: unable to get access token',
      );
      return null;
    }

    try {
      return await this.requestEquipment(token);
    } catch (error) {
      if (!this.isUnauthorizedError(error)) {
        throw error;
      }

      this.registrationNumbersAuthService.clearAccessToken();
      const refreshedToken =
        await this.registrationNumbersAuthService.getAccessToken(true);

      if (!refreshedToken) {
        this.logger.warn(
          'Skipped QLTB equipment sync: unable to refresh access token',
        );
        return null;
      }

      return this.requestEquipment(refreshedToken);
    }
  }

  private requestEquipment(token: string) {
    return axios.get(this.getEquipmentApiUrl(), {
      params: {
        page: 1,
        limit: this.getEquipmentSyncLimit(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private extractEquipmentRecords(
    payload: unknown,
  ): QltbEquipmentRecord[] | null {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!this.isObject(payload)) {
      return null;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (this.isObject(payload.data) && Array.isArray(payload.data.data)) {
      return payload.data.data;
    }

    return null;
  }

  private normalizeEquipmentRecords(records: QltbEquipmentRecord[]) {
    const equipmentByCode = new Map<string, EquipmentForSync>();

    for (const record of records) {
      const code = this.normalizeString(record.code, EQUIPMENT_CODE_MAX_LENGTH);
      const name = this.normalizeString(record.name, EQUIPMENT_NAME_MAX_LENGTH);

      if (!code || !name) {
        this.logger.warn(
          `Skipped invalid QLTB equipment record: ${JSON.stringify(record)}`,
        );
        continue;
      }

      if (equipmentByCode.has(code)) {
        this.logger.warn(`Skipped duplicate QLTB equipment code: ${code}`);
        continue;
      }

      equipmentByCode.set(code, { code, name });
    }

    return equipmentByCode;
  }

  private isCompleteSnapshot(
    payload: unknown,
    recordCount: number,
    requestedLimit: number,
  ) {
    const total = this.extractTotal(payload);

    if (total !== null) {
      return recordCount >= total;
    }

    return recordCount < requestedLimit;
  }

  private extractTotal(payload: unknown): number | null {
    if (!this.isObject(payload)) {
      return null;
    }

    const candidates = [
      payload.total,
      payload.totalItems,
      payload.totalCount,
      this.isObject(payload.meta) ? payload.meta.total : undefined,
      this.isObject(payload.meta) ? payload.meta.totalItems : undefined,
      this.isObject(payload.meta) ? payload.meta.totalCount : undefined,
      this.isObject(payload.pagination) ? payload.pagination.total : undefined,
      this.isObject(payload.pagination)
        ? payload.pagination.totalItems
        : undefined,
      this.isObject(payload.pagination)
        ? payload.pagination.totalCount
        : undefined,
      this.isObject(payload.data) ? payload.data.total : undefined,
      this.isObject(payload.data) ? payload.data.totalItems : undefined,
      this.isObject(payload.data) ? payload.data.totalCount : undefined,
      this.isObject(payload.data) && this.isObject(payload.data.meta)
        ? payload.data.meta.total
        : undefined,
      this.isObject(payload.data) && this.isObject(payload.data.meta)
        ? payload.data.meta.totalItems
        : undefined,
      this.isObject(payload.data) && this.isObject(payload.data.meta)
        ? payload.data.meta.totalCount
        : undefined,
      this.isObject(payload.data) && this.isObject(payload.data.pagination)
        ? payload.data.pagination.total
        : undefined,
      this.isObject(payload.data) && this.isObject(payload.data.pagination)
        ? payload.data.pagination.totalItems
        : undefined,
      this.isObject(payload.data) && this.isObject(payload.data.pagination)
        ? payload.data.pagination.totalCount
        : undefined,
    ];

    for (const candidate of candidates) {
      const total = Number(candidate);

      if (Number.isInteger(total) && total >= 0) {
        return total;
      }
    }

    return null;
  }

  private normalizeString(value: unknown, maxLength: number) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.trim();

    if (!normalizedValue || normalizedValue.length > maxLength) {
      return null;
    }

    return normalizedValue;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
