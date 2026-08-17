import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateDosageFormDto } from './dto/create-dosage-form.dto';
import { UpdateDosageFormDto } from './dto/update-dosage-form.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const dosageFormInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.DosageFormsInclude;

@Injectable()
export class DosageFormsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.dosageForms.findMany({
      include: dosageFormInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: number) {
    const dosageForm = await this.prismaService.dosageForms.findUnique({
      where: { id },
      include: dosageFormInclude,
    });

    if (!dosageForm) {
      throw new NotFoundException('Dosage form not found');
    }

    return dosageForm;
  }

  async create(dto: CreateDosageFormDto, user?: AuthenticatedUser) {
    const name = this.normalizeRequiredText(dto?.name, 'name');
    await this.ensureNameAvailable(name);

    return this.prismaService.dosageForms.create({
      data: {
        name,
        created_by_id: this.normalizeUserId(user),
      },
      include: dosageFormInclude,
    });
  }

  async update(id: number, dto: UpdateDosageFormDto) {
    await this.findById(id);

    if (dto.name === undefined) {
      throw new BadRequestException('No update data provided');
    }

    const name = this.normalizeRequiredText(dto.name, 'name');
    await this.ensureNameAvailable(name, id);

    return this.prismaService.dosageForms.update({
      where: { id },
      data: { name },
      include: dosageFormInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.dosageForms.delete({
      where: { id },
      include: dosageFormInclude,
    });
  }

  private async ensureNameAvailable(name: string, currentId?: number) {
    const existing = await this.prismaService.dosageForms.findUnique({
      where: { name },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Dosage form name already exists');
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
