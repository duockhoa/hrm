import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const EQUIPMENT_CODE_MAX_LENGTH = 100;
const EQUIPMENT_NAME_MAX_LENGTH = 255;

const equipmentCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const equipmentInclude = {
  createdBy: {
    select: equipmentCreatorSelect,
  },
} satisfies Prisma.EquipmentInclude;

@Injectable()
export class EquipmentService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.equipment.findMany({
      include: equipmentInclude,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: number) {
    const equipment = await this.prismaService.equipment.findUnique({
      where: { id },
      include: equipmentInclude,
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    return equipment;
  }

  async create(dto: CreateEquipmentDto, user?: AuthenticatedUser) {
    const data = this.buildCreateData(dto, user);
    await this.ensureCodeIsAvailable(data.code);

    return this.prismaService.equipment.create({
      data,
      include: equipmentInclude,
    });
  }

  async update(id: number, dto: UpdateEquipmentDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(id, dto);

    return this.prismaService.equipment.update({
      where: { id },
      data,
      include: equipmentInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.equipment.delete({
      where: { id },
      include: equipmentInclude,
    });
  }

  private buildCreateData(
    dto: CreateEquipmentDto,
    user?: AuthenticatedUser,
  ): Prisma.EquipmentUncheckedCreateInput {
    return {
      code: this.normalizeRequiredString(
        dto?.code,
        'code',
        EQUIPMENT_CODE_MAX_LENGTH,
      ),
      name: this.normalizeRequiredString(
        dto?.name,
        'name',
        EQUIPMENT_NAME_MAX_LENGTH,
      ),
      created_by_id: this.normalizeUserId(user),
    };
  }

  private async buildUpdateData(id: number, dto: UpdateEquipmentDto) {
    const updateDto = dto ?? {};
    const data: Prisma.EquipmentUncheckedUpdateInput = {};

    if ('code' in updateDto) {
      const code = this.normalizeRequiredString(
        updateDto.code,
        'code',
        EQUIPMENT_CODE_MAX_LENGTH,
      );
      await this.ensureCodeIsAvailable(code, id);
      data.code = code;
    }

    if ('name' in updateDto) {
      data.name = this.normalizeRequiredString(
        updateDto.name,
        'name',
        EQUIPMENT_NAME_MAX_LENGTH,
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private async ensureCodeIsAvailable(code: string, currentId?: number) {
    const existing = await this.prismaService.equipment.findUnique({
      where: { code },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Equipment code already exists');
    }
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

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
