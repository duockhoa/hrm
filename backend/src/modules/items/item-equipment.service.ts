import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateItemEquipmentDto } from './dto/create-item-equipment.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const itemEquipmentCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const itemEquipmentInclude = {
  equipment: {
    include: {
      parameters: {
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      },
    },
  },
  createdBy: {
    select: itemEquipmentCreatorSelect,
  },
} satisfies Prisma.ItemEquipmentInclude;

@Injectable()
export class ItemEquipmentService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByItem(itemCode: string) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    await this.ensureItemExists(normalizedItemCode);

    return this.prismaService.itemEquipment.findMany({
      where: { item_code: normalizedItemCode },
      include: itemEquipmentInclude,
      orderBy: [
        {
          equipment: {
            name: 'asc',
          },
        },
        { id: 'asc' },
      ],
    });
  }

  async findById(itemEquipmentId: number) {
    const itemEquipment = await this.prismaService.itemEquipment.findUnique({
      where: { id: itemEquipmentId },
      include: itemEquipmentInclude,
    });

    if (!itemEquipment) {
      throw new NotFoundException('Item equipment not found');
    }

    return itemEquipment;
  }

  async create(
    itemCode: string,
    dto: CreateItemEquipmentDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    const equipmentId = this.normalizeEquipmentId(dto?.equipment_id);

    await this.ensureItemExists(normalizedItemCode);
    await this.ensureEquipmentExists(equipmentId);
    await this.ensureItemEquipmentIsAvailable(normalizedItemCode, equipmentId);

    return this.prismaService.itemEquipment.create({
      data: {
        item_code: normalizedItemCode,
        equipment_id: equipmentId,
        created_by_id: this.normalizeUserId(user),
      },
      include: itemEquipmentInclude,
    });
  }

  async delete(itemEquipmentId: number) {
    await this.findById(itemEquipmentId);

    return this.prismaService.itemEquipment.delete({
      where: { id: itemEquipmentId },
      include: itemEquipmentInclude,
    });
  }

  private normalizeItemCode(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('item_code is required');
    }

    return value.trim();
  }

  private normalizeEquipmentId(value: unknown) {
    const equipmentId = Number(value);

    if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
      throw new BadRequestException('equipment_id is required');
    }

    return equipmentId;
  }

  private async ensureItemExists(itemCode: string) {
    const item = await this.prismaService.items.findUnique({
      where: { item_code: itemCode },
      select: { item_code: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
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

  private async ensureItemEquipmentIsAvailable(
    itemCode: string,
    equipmentId: number,
  ) {
    const existing = await this.prismaService.itemEquipment.findUnique({
      where: {
        item_code_equipment_id: {
          item_code: itemCode,
          equipment_id: equipmentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Item equipment already exists');
    }
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
