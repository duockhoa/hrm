import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  CreateEquipmentMonitoringRecordDto,
  CreateEquipmentMonitoringValueDto,
} from './dto/create-equipment-monitoring-record.dto';
import { UpdateEquipmentMonitoringRecordDto } from './dto/update-equipment-monitoring-record.dto';
import {
  getEquipmentMonitoringRecordImageLookupPaths,
  removeStoredEquipmentMonitoringRecordImage,
  resolveEquipmentMonitoringRecordImageFile,
} from './equipment-monitoring-record-upload.config';

type AuthenticatedUser = {
  id?: number | string | null;
};

type MonitoringParameter = {
  id: number;
  equipment_id: number;
  name: string;
  data_type: string;
  is_required: boolean;
};

type MonitoringValueCreateData = {
  parameter_id: number;
  value: string | null;
  note: string | null;
};

const monitoringCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const monitoringRecordInclude = {
  productionOrder: {
    select: {
      id: true,
      production_order_code: true,
      lot_no: true,
      item_code: true,
      item: {
        select: {
          item_code: true,
          item_name: true,
        },
      },
    },
  },
  equipment: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  createdBy: {
    select: monitoringCreatorSelect,
  },
  values: {
    include: {
      parameter: {
        select: {
          id: true,
          equipment_id: true,
          name: true,
          data_type: true,
          unit: true,
          is_required: true,
        },
      },
    },
    orderBy: {
      parameter_id: 'asc',
    },
  },
  images: {
    include: {
      createdBy: {
        select: monitoringCreatorSelect,
      },
    },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.EquipmentMonitoringRecordsInclude;

@Injectable()
export class EquipmentMonitoringRecordsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: {
    production_order_id?: unknown;
    equipment_id?: unknown;
  }) {
    const productionOrderId = this.normalizeOptionalPositiveInt(
      query?.production_order_id,
      'production_order_id',
    );
    const equipmentId = this.normalizeOptionalPositiveInt(
      query?.equipment_id,
      'equipment_id',
    );

    return this.prismaService.equipmentMonitoringRecords.findMany({
      where: {
        deleted_at: null,
        ...(productionOrderId
          ? { production_order_id: productionOrderId }
          : {}),
        ...(equipmentId ? { equipment_id: equipmentId } : {}),
      },
      include: monitoringRecordInclude,
      orderBy: [{ recorded_at: 'desc' }, { created_at: 'desc' }],
    });
  }

  async findById(recordId: number) {
    const record =
      await this.prismaService.equipmentMonitoringRecords.findFirst({
        where: {
          id: recordId,
          deleted_at: null,
        },
        include: monitoringRecordInclude,
      });

    if (!record) {
      throw new NotFoundException('Equipment monitoring record not found');
    }

    return record;
  }

  async findImageFile(filename: string, original = false) {
    const imagePaths = getEquipmentMonitoringRecordImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const image =
      await this.prismaService.equipmentMonitoringRecordImages.findFirst({
        where: {
          image_path: { in: imagePaths },
          record: { deleted_at: null },
        },
        select: { id: true },
      });

    return image
      ? resolveEquipmentMonitoringRecordImageFile(filename, original)
      : null;
  }

  async create(
    dto: CreateEquipmentMonitoringRecordDto,
    user?: AuthenticatedUser,
  ) {
    const productionOrderId = this.normalizeRequiredPositiveInt(
      dto?.production_order_id,
      'production_order_id',
    );
    const equipmentId = this.normalizeRequiredPositiveInt(
      dto?.equipment_id,
      'equipment_id',
    );

    await this.ensureProductionOrderExists(productionOrderId);
    await this.ensureEquipmentExists(equipmentId);
    const values = await this.buildValueCreateData(equipmentId, dto?.values);

    return this.prismaService.equipmentMonitoringRecords.create({
      data: {
        production_order_id: productionOrderId,
        equipment_id: equipmentId,
        recorded_at:
          dto?.recorded_at === undefined || dto.recorded_at === null
            ? undefined
            : this.normalizeRequiredDate(dto.recorded_at, 'recorded_at'),
        note: this.normalizeOptionalText(dto?.note),
        created_by_id: this.normalizeUserId(user),
        values: {
          create: values,
        },
      },
      include: monitoringRecordInclude,
    });
  }

  async update(recordId: number, dto: UpdateEquipmentMonitoringRecordDto) {
    const record = await this.findById(recordId);
    const updateDto = dto ?? {};
    const data: Prisma.EquipmentMonitoringRecordsUncheckedUpdateInput = {};
    let values: MonitoringValueCreateData[] | null = null;

    if ('recorded_at' in updateDto) {
      data.recorded_at = this.normalizeRequiredDate(
        updateDto.recorded_at,
        'recorded_at',
      );
    }

    if ('note' in updateDto) {
      data.note = this.normalizeOptionalText(updateDto.note);
    }

    if ('values' in updateDto) {
      values = await this.buildValueCreateData(
        record.equipment_id,
        updateDto.values,
      );
    }

    if (Object.keys(data).length === 0 && values === null) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prismaService.$transaction(async (tx) => {
      await tx.equipmentMonitoringRecords.update({
        where: { id: recordId },
        data,
      });

      if (values !== null) {
        await tx.equipmentMonitoringValues.deleteMany({
          where: { record_id: recordId },
        });
        await tx.equipmentMonitoringValues.createMany({
          data: values.map((value) => ({
            ...value,
            record_id: recordId,
          })),
        });
      }

      return tx.equipmentMonitoringRecords.findFirst({
        where: {
          id: recordId,
          deleted_at: null,
        },
        include: monitoringRecordInclude,
      });
    });
  }

  async delete(recordId: number) {
    await this.findById(recordId);

    return this.prismaService.equipmentMonitoringRecords.update({
      where: { id: recordId },
      data: {
        deleted_at: new Date(),
      },
      include: monitoringRecordInclude,
    });
  }

  async addImages(
    recordId: number,
    imagePaths: string[],
    user?: AuthenticatedUser,
  ) {
    if (imagePaths.length === 0) {
      throw new BadRequestException('images are required');
    }

    await this.findById(recordId);
    const userId = this.normalizeUserId(user);

    await this.prismaService.equipmentMonitoringRecordImages.createMany({
      data: imagePaths.map((imagePath) => ({
        record_id: recordId,
        image_path: imagePath,
        created_by_id: userId,
      })),
    });

    return this.findById(recordId);
  }

  async deleteImage(imageId: number) {
    const image =
      await this.prismaService.equipmentMonitoringRecordImages.findUnique({
        where: { id: imageId },
        include: {
          record: {
            select: { deleted_at: true },
          },
        },
      });

    if (!image || image.record.deleted_at) {
      throw new NotFoundException(
        'Equipment monitoring record image not found',
      );
    }

    await this.prismaService.equipmentMonitoringRecordImages.delete({
      where: { id: imageId },
    });
    await removeStoredEquipmentMonitoringRecordImage(image.image_path);

    return image;
  }

  private async buildValueCreateData(
    equipmentId: number,
    values: CreateEquipmentMonitoringValueDto[] | null | undefined,
  ): Promise<MonitoringValueCreateData[]> {
    if (!Array.isArray(values)) {
      throw new BadRequestException('values must be an array');
    }

    if (values.length === 0) {
      throw new BadRequestException('values must contain at least one item');
    }

    const parameters = await this.prismaService.equipmentParameters.findMany({
      where: { equipment_id: equipmentId },
      select: {
        id: true,
        equipment_id: true,
        name: true,
        data_type: true,
        is_required: true,
      },
    });

    if (parameters.length === 0) {
      throw new BadRequestException('Equipment has no parameters');
    }

    const parameterById = new Map(
      parameters.map((parameter) => [parameter.id, parameter]),
    );
    const seenParameterIds = new Set<number>();
    const createData: MonitoringValueCreateData[] = [];

    values.forEach((item, index) => {
      const parameterId = this.normalizeRequiredPositiveInt(
        item?.parameter_id,
        `values[${index}].parameter_id`,
      );

      if (seenParameterIds.has(parameterId)) {
        throw new BadRequestException(
          `values[${index}].parameter_id is duplicated`,
        );
      }

      const parameter = parameterById.get(parameterId);

      if (!parameter) {
        throw new BadRequestException(
          `values[${index}].parameter_id does not belong to equipment`,
        );
      }

      seenParameterIds.add(parameterId);
      createData.push({
        parameter_id: parameterId,
        value: this.normalizeValueText(item?.value, parameter),
        note: this.normalizeOptionalText(item?.note),
      });
    });

    parameters
      .filter((parameter) => parameter.is_required)
      .forEach((parameter) => {
        if (!seenParameterIds.has(parameter.id)) {
          throw new BadRequestException(`${parameter.name} is required`);
        }
      });

    return createData;
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async ensureEquipmentExists(equipmentId: number) {
    const equipment = await this.prismaService.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
  }

  private normalizeValueText(value: unknown, parameter: MonitoringParameter) {
    if (value === null || value === undefined) {
      if (parameter.is_required) {
        throw new BadRequestException(`${parameter.name} is required`);
      }

      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`${parameter.name} must be a valid date`);
      }

      return value.toISOString();
    }

    const normalizedValue =
      typeof value === 'string' ? value.trim() : String(value).trim();

    if (normalizedValue === '') {
      if (parameter.is_required) {
        throw new BadRequestException(`${parameter.name} is required`);
      }

      return null;
    }

    switch (parameter.data_type) {
      case 'number':
        return this.normalizeNumberText(normalizedValue, parameter.name);
      case 'boolean':
        return this.normalizeBooleanText(value, parameter.name);
      case 'date':
        return this.normalizeDateText(normalizedValue, parameter.name);
      case 'datetime':
        return this.normalizeDateTimeText(normalizedValue, parameter.name);
      default:
        return normalizedValue;
    }
  }

  private normalizeNumberText(value: string, fieldName: string) {
    const normalizedValue = value.replace(',', '.');
    const numberValue = Number(normalizedValue);

    if (!Number.isFinite(numberValue)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }

    return normalizedValue;
  }

  private normalizeBooleanText(value: unknown, fieldName: string) {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (['true', '1'].includes(normalizedValue)) {
      return 'true';
    }

    if (['false', '0'].includes(normalizedValue)) {
      return 'false';
    }

    throw new BadRequestException(`${fieldName} must be a valid boolean`);
  }

  private normalizeDateText(value: string, fieldName: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date.toISOString().slice(0, 10);
  }

  private normalizeDateTimeText(value: string, fieldName: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid datetime`);
    }

    return date.toISOString();
  }

  private normalizeRequiredDate(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`${fieldName} must be a valid date`);
      }

      return value;
    }

    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private normalizeOptionalText(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('note must be a string');
    }

    const normalizedValue = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
  }

  private normalizeRequiredPositiveInt(value: unknown, fieldName: string) {
    const intValue = Number(value);

    if (!Number.isInteger(intValue) || intValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return intValue;
  }

  private normalizeOptionalPositiveInt(value: unknown, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.normalizeRequiredPositiveInt(value, fieldName);
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
