import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateMixingActivityTemplateStageStepParameterDto } from './dto/create-mixing-activity-template-stage-step-parameter.dto';
import { UpdateMixingActivityTemplateStageStepParameterDto } from './dto/update-mixing-activity-template-stage-step-parameter.dto';

type AuthenticatedUser = { id?: number | string | null };

const DATA_TYPES = [
  'text',
  'number',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'select',
] as const;

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const mixingActivityTemplateStageStepParameterInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.MixingActivityTemplateStageStepParametersInclude;

@Injectable()
export class MixingActivityTemplateStageStepParametersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByStep(stepId: number) {
    const normalizedStepId = this.normalizePositiveInteger(stepId, 'stepId');
    await this.ensureStepExists(normalizedStepId);

    return this.prismaService.mixingActivityTemplateStageStepParameters.findMany(
      {
        where: { mixing_activity_template_stage_step_id: normalizedStepId },
        include: mixingActivityTemplateStageStepParameterInclude,
        orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
      },
    );
  }

  async findById(id: number) {
    const parameter =
      await this.prismaService.mixingActivityTemplateStageStepParameters.findUnique(
        {
          where: { id },
          include: mixingActivityTemplateStageStepParameterInclude,
        },
      );

    if (!parameter) {
      throw new NotFoundException(
        'Mixing activity template stage step parameter not found',
      );
    }

    return parameter;
  }

  async create(
    stepId: number,
    dto: CreateMixingActivityTemplateStageStepParameterDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedStepId = this.normalizePositiveInteger(stepId, 'stepId');
    await this.ensureStepExists(normalizedStepId);

    const parameterOrder = this.normalizePositiveInteger(
      dto?.parameter_order,
      'parameter_order',
    );
    await this.ensureParameterOrderAvailable(normalizedStepId, parameterOrder);

    return this.prismaService.mixingActivityTemplateStageStepParameters.create({
      data: {
        mixing_activity_template_stage_step_id: normalizedStepId,
        parameter_name: this.normalizeRequiredText(
          dto?.parameter_name,
          'parameter_name',
          255,
        ),
        data_type: this.normalizeDataType(dto?.data_type),
        requirement: this.normalizeRequiredText(
          dto?.requirement,
          'requirement',
        ),
        parameter_order: parameterOrder,
        created_by_id: this.normalizeUserId(user),
      },
      include: mixingActivityTemplateStageStepParameterInclude,
    });
  }

  async update(
    id: number,
    dto: UpdateMixingActivityTemplateStageStepParameterDto,
  ) {
    const parameter = await this.findById(id);
    const data = this.normalizeUpdateData(dto);

    const nextParameterOrder = data.parameter_order;
    if (typeof nextParameterOrder === 'number') {
      await this.ensureParameterOrderAvailable(
        parameter.mixing_activity_template_stage_step_id,
        nextParameterOrder,
        id,
      );
    }

    return this.prismaService.mixingActivityTemplateStageStepParameters.update({
      where: { id },
      data,
      include: mixingActivityTemplateStageStepParameterInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.mixingActivityTemplateStageStepParameters.delete({
      where: { id },
      include: mixingActivityTemplateStageStepParameterInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateMixingActivityTemplateStageStepParameterDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.MixingActivityTemplateStageStepParametersUpdateInput =
      {};

    if ('parameter_name' in updateDto) {
      data.parameter_name = this.normalizeRequiredText(
        updateDto.parameter_name,
        'parameter_name',
        255,
      );
    }

    if ('data_type' in updateDto) {
      data.data_type = this.normalizeDataType(updateDto.data_type);
    }

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeRequiredText(
        updateDto.requirement,
        'requirement',
      );
    }

    if ('parameter_order' in updateDto) {
      data.parameter_order = this.normalizePositiveInteger(
        updateDto.parameter_order,
        'parameter_order',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeRequiredText(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (maxLength && normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeDataType(value: unknown) {
    const normalizedValue = this.normalizeRequiredText(value, 'data_type', 30);

    if (!DATA_TYPES.includes(normalizedValue as (typeof DATA_TYPES)[number])) {
      throw new BadRequestException(
        `data_type must be one of: ${DATA_TYPES.join(', ')}`,
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

  private async ensureStepExists(stepId: number) {
    const step =
      await this.prismaService.mixingActivityTemplateStageSteps.findUnique({
        where: { id: stepId },
        select: { id: true },
      });

    if (!step) {
      throw new NotFoundException(
        'Mixing activity template stage step not found',
      );
    }
  }

  private async ensureParameterOrderAvailable(
    stepId: number,
    parameterOrder: number,
    excludedParameterId?: number,
  ) {
    const existing =
      await this.prismaService.mixingActivityTemplateStageStepParameters.findUnique(
        {
          where: {
            mixing_activity_template_stage_step_id_parameter_order: {
              mixing_activity_template_stage_step_id: stepId,
              parameter_order: parameterOrder,
            },
          },
          select: { id: true },
        },
      );

    if (existing && existing.id !== excludedParameterId) {
      throw new ConflictException(
        'Parameter order already exists for this mixing activity template stage step',
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
