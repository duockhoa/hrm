import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  mutateTemplateStructure, shiftTemplateOrdersForInsert, compactTemplateOrders,
  moveTemplateNode, validateMoveDirection,
} from './mixing-activity-template-order.utils';
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

  async findById(id: number, client: Prisma.TransactionClient = this.prismaService) {
    const parameter =
      await client.mixingActivityTemplateStageStepParameters.findUnique(
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
    const parentId = this.normalizePositiveInteger(stepId, 'stepId');
    const order = this.normalizePositiveInteger(dto?.parameter_order, 'parameter_order');
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(this.prismaService, { kind: 'step', id: parentId }, async (tx) => {
      await this.ensureStepExists(parentId, tx);
      await this.ensureParameterOrderAvailable(parentId, order, undefined, tx);
      const created = await tx.mixingActivityTemplateStageStepParameters.create({
        data: {
          mixing_activity_template_stage_step_id: parentId,
          parameter_name: this.normalizeRequiredText(dto?.parameter_name, 'parameter_name', 255),
          data_type: this.normalizeDataType(dto?.data_type),
          unit: this.normalizeOptionalText(dto?.unit, 'unit', 50),
          requirement: this.normalizeRequiredText(dto?.requirement, 'requirement'),
          parameter_order: order,
          created_by_id: userId,
        },
        include: mixingActivityTemplateStageStepParameterInclude,
      });
      return { ...created,  siblings: await this.findSiblings(tx, parentId) };
    });
  }

  async update(id: number, dto: UpdateMixingActivityTemplateStageStepParameterDto) {
    const data = this.normalizeUpdateData(dto);
    return mutateTemplateStructure(this.prismaService, { kind: 'parameter', id }, async (tx) => {
      const current = await this.findById(id, tx);
      if (typeof data.parameter_order === 'number') {
        await this.ensureParameterOrderAvailable(current.mixing_activity_template_stage_step_id, data.parameter_order, id, tx);
      }
      const updated = await tx.mixingActivityTemplateStageStepParameters.update({
        where: { id }, data, include: mixingActivityTemplateStageStepParameterInclude,
      });
      return { ...updated, siblings: await this.findSiblings(tx, current.mixing_activity_template_stage_step_id) };
    });
  }

  async delete(id: number) {
    return mutateTemplateStructure(this.prismaService, { kind: 'parameter', id }, async (tx) => {
      const current = await this.findById(id, tx);
      const deleted = await tx.mixingActivityTemplateStageStepParameters.delete({
        where: { id }, include: mixingActivityTemplateStageStepParameterInclude,
      });
      const remaining = await this.findSiblings(tx, current.mixing_activity_template_stage_step_id);
      await compactTemplateOrders(remaining.map((node) => ({ id: node.id, order: node.parameter_order })),
        (nodeId, order) => tx.mixingActivityTemplateStageStepParameters.update({ where: { id: nodeId }, data: { parameter_order: order } }));
      return { ...deleted, siblings: await this.findSiblings(tx, current.mixing_activity_template_stage_step_id) };
    });
  }

  async move(id: number, direction: unknown) {
    validateMoveDirection(direction);
    return mutateTemplateStructure(this.prismaService, { kind: 'parameter', id }, async (tx) => {
      const current = await this.findById(id, tx);
      const siblings = await this.findSiblings(tx, current.mixing_activity_template_stage_step_id);
      await moveTemplateNode(siblings.map((node) => ({ id: node.id, order: node.parameter_order })), id, direction,
        (nodeId, order) => tx.mixingActivityTemplateStageStepParameters.update({ where: { id: nodeId }, data: { parameter_order: order } }));
      return { ...await this.findById(id, tx), siblings: await this.findSiblings(tx, current.mixing_activity_template_stage_step_id) };
    });
  }

  async duplicate(id: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(this.prismaService, { kind: 'parameter', id }, async (tx) => {
      const source = await tx.mixingActivityTemplateStageStepParameters.findUnique({
        where: { id }, include: mixingActivityTemplateStageStepParameterInclude,
      });
      if (!source) throw new NotFoundException('Mixing activity template parameter not found');
      const siblings = await this.findSiblings(tx, source.mixing_activity_template_stage_step_id);
      const order = source.parameter_order + 1;
      await shiftTemplateOrdersForInsert(siblings.map((node) => ({ id: node.id, order: node.parameter_order })), order,
        (nodeId, nextOrder) => tx.mixingActivityTemplateStageStepParameters.update({ where: { id: nodeId }, data: { parameter_order: nextOrder } }));
      const created = await tx.mixingActivityTemplateStageStepParameters.create({
        data: {
          mixing_activity_template_stage_step_id: source.mixing_activity_template_stage_step_id,
          parameter_name: source.parameter_name,
          data_type: source.data_type,
          unit: source.unit,
          requirement: source.requirement,
          parameter_order: order,
          created_by_id: userId,
        },
        include: mixingActivityTemplateStageStepParameterInclude,
      });
      return { ...created, siblings: await this.findSiblings(tx, source.mixing_activity_template_stage_step_id) };
    });
  }

  private findSiblings(tx: Prisma.TransactionClient, parentId: number) {
    return tx.mixingActivityTemplateStageStepParameters.findMany({
      where: { mixing_activity_template_stage_step_id: parentId },
      include: mixingActivityTemplateStageStepParameterInclude,
      orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
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

    if ('unit' in updateDto) {
      data.unit = this.normalizeOptionalText(updateDto.unit, 'unit', 50);
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

  private normalizeOptionalText(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      return null;
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

  private async ensureStepExists(stepId: number, client: Prisma.TransactionClient = this.prismaService) {
    const step =
      await client.mixingActivityTemplateStageSteps.findUnique({
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
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const existing =
      await client.mixingActivityTemplateStageStepParameters.findUnique(
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
