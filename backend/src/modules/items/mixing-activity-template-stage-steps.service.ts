import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateMixingActivityTemplateStageStepDto } from './dto/create-mixing-activity-template-stage-step.dto';
import { UpdateMixingActivityTemplateStageStepDto } from './dto/update-mixing-activity-template-stage-step.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const mixingActivityTemplateStageStepInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.MixingActivityTemplateStageStepsInclude;

@Injectable()
export class MixingActivityTemplateStageStepsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByStage(stageId: number) {
    const normalizedStageId = this.normalizePositiveInteger(stageId, 'stageId');
    await this.ensureStageExists(normalizedStageId);

    return this.prismaService.mixingActivityTemplateStageSteps.findMany({
      where: { mixing_activity_template_stage_id: normalizedStageId },
      include: mixingActivityTemplateStageStepInclude,
      orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: number) {
    const step =
      await this.prismaService.mixingActivityTemplateStageSteps.findUnique({
        where: { id },
        include: mixingActivityTemplateStageStepInclude,
      });

    if (!step) {
      throw new NotFoundException(
        'Mixing activity template stage step not found',
      );
    }

    return step;
  }

  async create(
    stageId: number,
    dto: CreateMixingActivityTemplateStageStepDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedStageId = this.normalizePositiveInteger(stageId, 'stageId');
    await this.ensureStageExists(normalizedStageId);

    const stepOrder = this.normalizePositiveInteger(
      dto?.step_order,
      'step_order',
    );
    await this.ensureStepOrderAvailable(normalizedStageId, stepOrder);

    return this.prismaService.mixingActivityTemplateStageSteps.create({
      data: {
        mixing_activity_template_stage_id: normalizedStageId,
        step_name: this.normalizeStepName(dto?.step_name),
        step_order: stepOrder,
        created_by_id: this.normalizeUserId(user),
      },
      include: mixingActivityTemplateStageStepInclude,
    });
  }

  async update(id: number, dto: UpdateMixingActivityTemplateStageStepDto) {
    const step = await this.findById(id);
    const data = this.normalizeUpdateData(dto);

    const nextStepOrder = data.step_order;
    if (typeof nextStepOrder === 'number') {
      await this.ensureStepOrderAvailable(
        step.mixing_activity_template_stage_id,
        nextStepOrder,
        id,
      );
    }

    return this.prismaService.mixingActivityTemplateStageSteps.update({
      where: { id },
      data,
      include: mixingActivityTemplateStageStepInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.mixingActivityTemplateStageSteps.delete({
      where: { id },
      include: mixingActivityTemplateStageStepInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateMixingActivityTemplateStageStepDto) {
    const updateDto = dto ?? {};
    const data: Prisma.MixingActivityTemplateStageStepsUpdateInput = {};

    if ('step_name' in updateDto) {
      data.step_name = this.normalizeStepName(updateDto.step_name);
    }

    if ('step_order' in updateDto) {
      data.step_order = this.normalizePositiveInteger(
        updateDto.step_order,
        'step_order',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeStepName(value: unknown) {
    if (value === null || value === undefined) {
      throw new BadRequestException('step_name is required');
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException('step_name is required');
    }

    if (normalizedValue.length > 255) {
      throw new BadRequestException('step_name must not exceed 255 characters');
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

  private async ensureStageExists(stageId: number) {
    const stage =
      await this.prismaService.mixingActivityTemplateStages.findUnique({
        where: { id: stageId },
        select: { id: true },
      });

    if (!stage) {
      throw new NotFoundException('Mixing activity template stage not found');
    }
  }

  private async ensureStepOrderAvailable(
    stageId: number,
    stepOrder: number,
    excludedStepId?: number,
  ) {
    const existing =
      await this.prismaService.mixingActivityTemplateStageSteps.findUnique({
        where: {
          mixing_activity_template_stage_id_step_order: {
            mixing_activity_template_stage_id: stageId,
            step_order: stepOrder,
          },
        },
        select: { id: true },
      });

    if (existing && existing.id !== excludedStepId) {
      throw new ConflictException(
        'Step order already exists for this mixing activity template stage',
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
