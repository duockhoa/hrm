import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionWorkshopCleaningChecklistDto } from './dto/create-production-workshop-cleaning-checklist.dto';
import { UpdateProductionWorkshopCleaningChecklistDto } from './dto/update-production-workshop-cleaning-checklist.dto';

const INTEGER_MAX = 2147483647;

const cleaningChecklistUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const cleaningChecklistInclude = {
  workshop: true,
  cleanedBy: {
    select: cleaningChecklistUserSelect,
  },
} satisfies Prisma.ProductionWorkshopCleaningChecklistsInclude;

@Injectable()
export class ProductionWorkshopCleaningChecklistsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(cleaningChecklistId: number) {
    const cleaningChecklist =
      await this.prismaService.productionWorkshopCleaningChecklists.findUnique({
        where: { id: cleaningChecklistId },
        include: cleaningChecklistInclude,
      });

    if (!cleaningChecklist) {
      throw new NotFoundException('Cleaning checklist not found');
    }

    return cleaningChecklist;
  }

  async findAllByProductionWorkshop(workshopId: number) {
    await this.ensureProductionWorkshopExists(workshopId);

    return this.prismaService.productionWorkshopCleaningChecklists.findMany({
      where: { workshop_id: workshopId },
      include: cleaningChecklistInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    workshopId: number,
    dto: CreateProductionWorkshopCleaningChecklistDto,
  ) {
    await this.ensureProductionWorkshopExists(workshopId);

    const cleanedById = this.normalizeRequiredInteger(
      dto?.cleaned_by_id,
      'cleaned_by_id',
    );
    await this.ensureUserExists(cleanedById);

    return this.prismaService.productionWorkshopCleaningChecklists.create({
      data: {
        workshop_id: workshopId,
        subject: this.normalizeRequiredString(dto?.subject, 'subject', 255),
        category: this.normalizeRequiredString(dto?.category, 'category', 100),
        requirement: this.normalizeRequiredString(dto?.requirement, 'requirement'),
        result: this.normalizeRequiredString(dto?.result, 'result', 100),
        note: this.normalizeOptionalString(dto?.note, 'note'),
        cleaned_by_id: cleanedById,
      },
      include: cleaningChecklistInclude,
    });
  }

  async update(
    cleaningChecklistId: number,
    dto: UpdateProductionWorkshopCleaningChecklistDto,
  ) {
    await this.findById(cleaningChecklistId);

    const data: Prisma.ProductionWorkshopCleaningChecklistsUncheckedUpdateInput =
      {};

    if (dto.subject !== undefined) {
      data.subject = this.normalizeRequiredString(dto.subject, 'subject', 255);
    }

    if (dto.category !== undefined) {
      data.category = this.normalizeRequiredString(dto.category, 'category', 100);
    }

    if (dto.requirement !== undefined) {
      data.requirement = this.normalizeRequiredString(
        dto.requirement,
        'requirement',
      );
    }

    if (dto.result !== undefined) {
      data.result = this.normalizeRequiredString(dto.result, 'result', 100);
    }

    if (dto.note !== undefined) {
      data.note = this.normalizeOptionalString(dto.note, 'note');
    }

    if (dto.cleaned_by_id !== undefined) {
      const cleanedById = this.normalizeRequiredInteger(
        dto.cleaned_by_id,
        'cleaned_by_id',
      );
      await this.ensureUserExists(cleanedById);
      data.cleaned_by_id = cleanedById;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return this.prismaService.productionWorkshopCleaningChecklists.update({
      where: { id: cleaningChecklistId },
      data,
      include: cleaningChecklistInclude,
    });
  }

  async delete(cleaningChecklistId: number) {
    const cleaningChecklist = await this.findById(cleaningChecklistId);

    await this.prismaService.productionWorkshopCleaningChecklists.delete({
      where: { id: cleaningChecklistId },
    });

    return cleaningChecklist;
  }

  private async ensureProductionWorkshopExists(workshopId: number) {
    const workshop = await this.prismaService.productionWorkshops.findUnique({
      where: { id: workshopId },
      select: { id: true },
    });

    if (!workshop) {
      throw new NotFoundException('Production workshop not found');
    }
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Cleaning user not found');
    }
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength = 65535,
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

  private normalizeOptionalString(value: unknown, fieldName: string) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length > 65535) {
      throw new BadRequestException(
        `${fieldName} must be at most 65535 characters`,
      );
    }

    return normalizedValue || null;
  }

  private normalizeRequiredInteger(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    let normalizedValue: number;

    if (typeof value === 'number') {
      normalizedValue = value;
    } else if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      normalizedValue = Number(value.trim());
    } else {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (
      !Number.isInteger(normalizedValue) ||
      normalizedValue <= 0 ||
      normalizedValue > INTEGER_MAX
    ) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }
}
