import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateSecondaryPackagingStageRequirementDto } from './dto/create-secondary-packaging-stage-requirement.dto';
import { UpdateSecondaryPackagingStageRequirementDto } from './dto/update-secondary-packaging-stage-requirement.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const stageRequirementInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.SecondaryPackagingStageRequirementsInclude;

@Injectable()
export class SecondaryPackagingStageRequirementsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.secondaryPackagingStageRequirements.findMany({
      include: stageRequirementInclude,
      orderBy: [{ stage: 'asc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const stageRequirement =
      await this.prismaService.secondaryPackagingStageRequirements.findUnique({
        where: { id },
        include: stageRequirementInclude,
      });

    if (!stageRequirement) {
      throw new NotFoundException(
        'Secondary packaging stage requirement not found',
      );
    }

    return stageRequirement;
  }

  async create(
    dto: CreateSecondaryPackagingStageRequirementDto,
    user?: AuthenticatedUser,
  ) {
    return this.prismaService.secondaryPackagingStageRequirements.create({
      data: {
        stage: this.normalizeRequiredString(dto?.stage, 'stage', 100),
        requirement: this.normalizeRequiredText(
          dto?.requirement,
          'requirement',
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: stageRequirementInclude,
    });
  }

  async update(id: number, dto: UpdateSecondaryPackagingStageRequirementDto) {
    await this.findById(id);
    const data = this.normalizeUpdateData(dto);

    return this.prismaService.secondaryPackagingStageRequirements.update({
      where: { id },
      data,
      include: stageRequirementInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.secondaryPackagingStageRequirements.delete({
      where: { id },
      include: stageRequirementInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateSecondaryPackagingStageRequirementDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.SecondaryPackagingStageRequirementsUpdateInput = {};

    if ('stage' in updateDto) {
      data.stage = this.normalizeRequiredString(updateDto.stage, 'stage', 100);
    }

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeRequiredText(
        updateDto.requirement,
        'requirement',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    const normalizedValue = this.normalizeRequiredText(value, fieldName);

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
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
