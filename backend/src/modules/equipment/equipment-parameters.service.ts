import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateEquipmentParameterDto } from './dto/create-equipment-parameter.dto';
import { UpdateEquipmentParameterDto } from './dto/update-equipment-parameter.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const PARAMETER_NAME_MAX_LENGTH = 255;
const PARAMETER_DATA_TYPE_MAX_LENGTH = 50;
const PARAMETER_UNIT_MAX_LENGTH = 50;
const ALLOWED_DATA_TYPES = new Set([
  'text',
  'number',
  'boolean',
  'date',
  'datetime',
  'select',
]);

const parameterCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const equipmentParameterInclude = {
  createdBy: {
    select: parameterCreatorSelect,
  },
} satisfies Prisma.EquipmentParametersInclude;

@Injectable()
export class EquipmentParametersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(parameterId: number) {
    const parameter = await this.prismaService.equipmentParameters.findUnique({
      where: { id: parameterId },
      include: equipmentParameterInclude,
    });

    if (!parameter) {
      throw new NotFoundException('Equipment parameter not found');
    }

    return parameter;
  }

  async findAllByEquipment(equipmentId: number) {
    await this.ensureEquipmentExists(equipmentId);

    return this.prismaService.equipmentParameters.findMany({
      where: { equipment_id: equipmentId },
      include: equipmentParameterInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async create(
    equipmentId: number,
    dto: CreateEquipmentParameterDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureEquipmentExists(equipmentId);
    const data = this.buildCreateData(equipmentId, dto, user);
    await this.ensureNameIsAvailable(equipmentId, data.name);

    return this.prismaService.equipmentParameters.create({
      data,
      include: equipmentParameterInclude,
    });
  }

  async update(parameterId: number, dto: UpdateEquipmentParameterDto) {
    const parameter = await this.findById(parameterId);
    const data = await this.buildUpdateData(parameter, dto);

    return this.prismaService.equipmentParameters.update({
      where: { id: parameterId },
      data,
      include: equipmentParameterInclude,
    });
  }

  async delete(parameterId: number) {
    await this.findById(parameterId);

    return this.prismaService.equipmentParameters.delete({
      where: { id: parameterId },
      include: equipmentParameterInclude,
    });
  }

  private buildCreateData(
    equipmentId: number,
    dto: CreateEquipmentParameterDto,
    user?: AuthenticatedUser,
  ): Prisma.EquipmentParametersUncheckedCreateInput {
    return {
      equipment_id: equipmentId,
      name: this.normalizeRequiredString(
        dto?.name,
        'name',
        PARAMETER_NAME_MAX_LENGTH,
      ),
      data_type: this.normalizeDataType(dto?.data_type),
      unit: this.normalizeOptionalString(
        dto?.unit,
        'unit',
        PARAMETER_UNIT_MAX_LENGTH,
      ),
      is_required: this.normalizeOptionalBoolean(dto?.is_required, true),
      created_by_id: this.normalizeUserId(user),
    };
  }

  private async buildUpdateData(
    parameter: { id: number; equipment_id: number; name: string },
    dto: UpdateEquipmentParameterDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.EquipmentParametersUncheckedUpdateInput = {};

    if ('name' in updateDto) {
      const name = this.normalizeRequiredString(
        updateDto.name,
        'name',
        PARAMETER_NAME_MAX_LENGTH,
      );
      await this.ensureNameIsAvailable(
        parameter.equipment_id,
        name,
        parameter.id,
      );
      data.name = name;
    }

    if ('data_type' in updateDto) {
      data.data_type = this.normalizeDataType(updateDto.data_type);
    }

    if ('unit' in updateDto) {
      data.unit = this.normalizeOptionalString(
        updateDto.unit,
        'unit',
        PARAMETER_UNIT_MAX_LENGTH,
      );
    }

    if ('is_required' in updateDto) {
      data.is_required = this.normalizeRequiredBoolean(updateDto.is_required);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
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

  private async ensureNameIsAvailable(
    equipmentId: number,
    name: string,
    currentId?: number,
  ) {
    const existing = await this.prismaService.equipmentParameters.findUnique({
      where: {
        equipment_id_name: {
          equipment_id: equipmentId,
          name,
        },
      },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Equipment parameter name already exists');
    }
  }

  private normalizeDataType(value: unknown) {
    const dataType = this.normalizeRequiredString(
      value,
      'data_type',
      PARAMETER_DATA_TYPE_MAX_LENGTH,
    ).toLowerCase();

    if (!ALLOWED_DATA_TYPES.has(dataType)) {
      throw new BadRequestException(
        'data_type must be one of: text, number, boolean, date, datetime, select',
      );
    }

    return dataType;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalBoolean(value: unknown, defaultValue: boolean) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    return this.normalizeRequiredBoolean(value);
  }

  private normalizeRequiredBoolean(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 1 || value === '1' || value === 'true') {
      return true;
    }

    if (value === 0 || value === '0' || value === 'false') {
      return false;
    }

    throw new BadRequestException('is_required must be a boolean');
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
