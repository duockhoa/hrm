import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateMixingActivityTemplateStageDto } from './dto/create-mixing-activity-template-stage.dto';
import { UpdateMixingActivityTemplateStageDto } from './dto/update-mixing-activity-template-stage.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const mixingActivityTemplateStageInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.MixingActivityTemplateStagesInclude;

@Injectable()
export class MixingActivityTemplateStagesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByTemplate(templateId: number) {
    const normalizedTemplateId = this.normalizePositiveInteger(
      templateId,
      'templateId',
    );
    await this.ensureTemplateExists(normalizedTemplateId);

    return this.prismaService.mixingActivityTemplateStages.findMany({
      where: { mixing_activity_template_id: normalizedTemplateId },
      include: mixingActivityTemplateStageInclude,
      orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: number) {
    const stage =
      await this.prismaService.mixingActivityTemplateStages.findUnique({
        where: { id },
        include: mixingActivityTemplateStageInclude,
      });

    if (!stage) {
      throw new NotFoundException('Mixing activity template stage not found');
    }

    return stage;
  }

  async create(
    templateId: number,
    dto: CreateMixingActivityTemplateStageDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedTemplateId = this.normalizePositiveInteger(
      templateId,
      'templateId',
    );
    await this.ensureTemplateExists(normalizedTemplateId);

    const stageOrder = this.normalizePositiveInteger(
      dto?.stage_order,
      'stage_order',
    );
    await this.ensureStageOrderAvailable(normalizedTemplateId, stageOrder);

    return this.prismaService.mixingActivityTemplateStages.create({
      data: {
        mixing_activity_template_id: normalizedTemplateId,
        stage_name: this.normalizeStageName(dto?.stage_name),
        stage_order: stageOrder,
        created_by_id: this.normalizeUserId(user),
      },
      include: mixingActivityTemplateStageInclude,
    });
  }

  async update(id: number, dto: UpdateMixingActivityTemplateStageDto) {
    const stage = await this.findById(id);
    const data = this.normalizeUpdateData(dto);

    const nextStageOrder = data.stage_order;
    if (typeof nextStageOrder === 'number') {
      await this.ensureStageOrderAvailable(
        stage.mixing_activity_template_id,
        nextStageOrder,
        id,
      );
    }

    return this.prismaService.mixingActivityTemplateStages.update({
      where: { id },
      data,
      include: mixingActivityTemplateStageInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.mixingActivityTemplateStages.delete({
      where: { id },
      include: mixingActivityTemplateStageInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateMixingActivityTemplateStageDto) {
    const updateDto = dto ?? {};
    const data: Prisma.MixingActivityTemplateStagesUpdateInput = {};

    if ('stage_name' in updateDto) {
      data.stage_name = this.normalizeStageName(updateDto.stage_name);
    }

    if ('stage_order' in updateDto) {
      data.stage_order = this.normalizePositiveInteger(
        updateDto.stage_order,
        'stage_order',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeStageName(value: unknown) {
    if (value === null || value === undefined) {
      throw new BadRequestException('stage_name is required');
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException('stage_name is required');
    }

    if (normalizedValue.length > 255) {
      throw new BadRequestException(
        'stage_name must not exceed 255 characters',
      );
    }

    return normalizedValue;
  }

  private normalizePositiveInteger(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private async ensureTemplateExists(templateId: number) {
    const template =
      await this.prismaService.mixingActivityTemplates.findUnique({
        where: { id: templateId },
        select: { id: true },
      });

    if (!template) {
      throw new NotFoundException('Mixing activity template not found');
    }
  }

  private async ensureStageOrderAvailable(
    templateId: number,
    stageOrder: number,
    excludedStageId?: number,
  ) {
    const existing =
      await this.prismaService.mixingActivityTemplateStages.findUnique({
        where: {
          mixing_activity_template_id_stage_order: {
            mixing_activity_template_id: templateId,
            stage_order: stageOrder,
          },
        },
        select: { id: true },
      });

    if (existing && existing.id !== excludedStageId) {
      throw new ConflictException(
        'Stage order already exists for this mixing activity template',
      );
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
