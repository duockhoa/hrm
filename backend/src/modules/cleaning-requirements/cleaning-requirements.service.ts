import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateCleaningRequirementDto } from './dto/create-cleaning-requirement.dto';
import { UpdateCleaningRequirementDto } from './dto/update-cleaning-requirement.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const cleaningRequirementInclude = {
  cleaningObject: {
    select: {
      id: true,
      name: true,
      qr_code: true,
    },
  },
  createdBy: { select: creatorSelect },
} satisfies Prisma.CleaningRequirementsInclude;

@Injectable()
export class CleaningRequirementsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.cleaningRequirements.findMany({
      include: cleaningRequirementInclude,
      orderBy: [{ cleaning_object_id: 'asc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const requirement = await this.prismaService.cleaningRequirements.findUnique({
      where: { id },
      include: cleaningRequirementInclude,
    });

    if (!requirement) {
      throw new NotFoundException('Cleaning requirement not found');
    }

    return requirement;
  }

  async create(dto: CreateCleaningRequirementDto, user?: AuthenticatedUser) {
    const data = await this.buildCreateData(dto);

    return this.prismaService.cleaningRequirements.create({
      data: {
        ...data,
        created_by_id: this.normalizeUserId(user),
      },
      include: cleaningRequirementInclude,
    });
  }

  async update(id: number, dto: UpdateCleaningRequirementDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(dto);

    return this.prismaService.cleaningRequirements.update({
      where: { id },
      data,
      include: cleaningRequirementInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.cleaningRequirements.delete({
      where: { id },
      include: cleaningRequirementInclude,
    });
  }

  private async buildCreateData(dto: CreateCleaningRequirementDto) {
    const cleaning_object_id = this.normalizeRequiredPositiveInt(
      dto?.cleaning_object_id,
      'cleaning_object_id',
    );
    await this.ensureCleaningObjectExists(cleaning_object_id);

    return {
      cleaning_object_id,
      requirement_type: this.normalizeRequiredText(
        dto?.requirement_type,
        'requirement_type',
      ),
      requirement_content: this.normalizeRequiredText(
        dto?.requirement_content,
        'requirement_content',
      ),
    };
  }

  private async buildUpdateData(dto: UpdateCleaningRequirementDto) {
    const data: Prisma.CleaningRequirementsUncheckedUpdateInput = {};

    if (dto.cleaning_object_id !== undefined) {
      const cleaningObjectId = this.normalizeRequiredPositiveInt(
        dto.cleaning_object_id,
        'cleaning_object_id',
      );
      await this.ensureCleaningObjectExists(cleaningObjectId);
      data.cleaning_object_id = cleaningObjectId;
    }

    if (dto.requirement_type !== undefined) {
      data.requirement_type = this.normalizeRequiredText(
        dto.requirement_type,
        'requirement_type',
      );
    }

    if (dto.requirement_content !== undefined) {
      data.requirement_content = this.normalizeRequiredText(
        dto.requirement_content,
        'requirement_content',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureCleaningObjectExists(id: number) {
    const object = await this.prismaService.cleaningObjects.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!object) {
      throw new NotFoundException('Cleaning object not found');
    }
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeRequiredPositiveInt(value: unknown, fieldName: string) {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value.trim())
          ? Number(value.trim())
          : Number.NaN;

    if (!Number.isSafeInteger(numericValue) || numericValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return numericValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
