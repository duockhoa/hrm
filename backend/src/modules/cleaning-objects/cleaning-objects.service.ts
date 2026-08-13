import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateCleaningObjectDto } from './dto/create-cleaning-object.dto';
import { UpdateCleaningObjectDto } from './dto/update-cleaning-object.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const requirementInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.CleaningRequirementsInclude;

const objectInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.CleaningObjectsInclude;

const objectDetailInclude = {
  ...objectInclude,
  cleaningRequirements: {
    include: requirementInclude,
    orderBy: { id: 'desc' },
  },
} satisfies Prisma.CleaningObjectsInclude;

@Injectable()
export class CleaningObjectsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    const objects = await this.prismaService.cleaningObjects.findMany({
      include: {
        ...objectInclude,
        _count: { select: { cleaningRequirements: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return objects.map(({ _count, ...object }) => ({
      ...object,
      cleaning_requirements_count: _count.cleaningRequirements,
    }));
  }

  async findById(id: number) {
    const object = await this.prismaService.cleaningObjects.findUnique({
      where: { id },
      include: objectDetailInclude,
    });

    if (!object) {
      throw new NotFoundException('Cleaning object not found');
    }

    return object;
  }

  async findByQrCode(qrCode: string) {
    const qr_code = this.normalizeRequiredText(qrCode, 'qr_code');
    const object = await this.prismaService.cleaningObjects.findUnique({
      where: { qr_code },
      include: objectDetailInclude,
    });

    if (!object) {
      throw new NotFoundException('Cleaning object not found');
    }

    return object;
  }

  async create(dto: CreateCleaningObjectDto, user?: AuthenticatedUser) {
    const data = this.buildCreateData(dto);
    await this.ensureQrCodeAvailable(data.qr_code);

    return this.prismaService.cleaningObjects.create({
      data: {
        ...data,
        created_by_id: this.normalizeUserId(user),
      },
      include: objectInclude,
    });
  }

  async update(id: number, dto: UpdateCleaningObjectDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(dto, id);

    return this.prismaService.cleaningObjects.update({
      where: { id },
      data,
      include: objectInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.cleaningObjects.delete({
      where: { id },
      include: objectInclude,
    });
  }

  private buildCreateData(dto: CreateCleaningObjectDto) {
    return {
      name: this.normalizeRequiredText(dto?.name, 'name'),
      qr_code: this.normalizeRequiredText(dto?.qr_code, 'qr_code'),
    };
  }

  private async buildUpdateData(dto: UpdateCleaningObjectDto, id: number) {
    const data: Prisma.CleaningObjectsUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredText(dto.name, 'name');
    }

    if (dto.qr_code !== undefined) {
      const qrCode = this.normalizeRequiredText(dto.qr_code, 'qr_code');
      await this.ensureQrCodeAvailable(qrCode, id);
      data.qr_code = qrCode;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureQrCodeAvailable(qrCode: string, currentId?: number) {
    const existing = await this.prismaService.cleaningObjects.findUnique({
      where: { qr_code: qrCode },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('QR code already exists');
    }
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
