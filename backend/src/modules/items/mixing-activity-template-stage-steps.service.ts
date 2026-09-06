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

  async findById(id: number, client: Prisma.TransactionClient = this.prismaService) {
    const step =
      await client.mixingActivityTemplateStageSteps.findUnique({
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
    const parentId = this.normalizePositiveInteger(stageId, 'stageId');
    const order = this.normalizePositiveInteger(dto?.step_order, 'step_order');
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(this.prismaService, { kind: 'stage', id: parentId }, async (tx) => {
      await this.ensureStageExists(parentId, tx);
      await this.ensureStepOrderAvailable(parentId, order, undefined, tx);
      const created = await tx.mixingActivityTemplateStageSteps.create({
        data: {
          mixing_activity_template_stage_id: parentId,
          step_name: this.normalizeStepName(dto?.step_name),
          step_order: order,
          created_by_id: userId,
        },
        include: mixingActivityTemplateStageStepInclude,
      });
      return { ...created, parameters: [], siblings: await this.findSiblings(tx, parentId) };
    });
  }

  async update(id: number, dto: UpdateMixingActivityTemplateStageStepDto) {
    const data = this.normalizeUpdateData(dto);
    return mutateTemplateStructure(this.prismaService, { kind: 'step', id }, async (tx) => {
      const current = await this.findById(id, tx);
      if (typeof data.step_order === 'number') {
        await this.ensureStepOrderAvailable(current.mixing_activity_template_stage_id, data.step_order, id, tx);
      }
      const updated = await tx.mixingActivityTemplateStageSteps.update({
        where: { id }, data, include: mixingActivityTemplateStageStepInclude,
      });
      return { ...updated, siblings: await this.findSiblings(tx, current.mixing_activity_template_stage_id) };
    });
  }

  async delete(id: number) {
    return mutateTemplateStructure(this.prismaService, { kind: 'step', id }, async (tx) => {
      const current = await this.findById(id, tx);
      const deleted = await tx.mixingActivityTemplateStageSteps.delete({
        where: { id }, include: mixingActivityTemplateStageStepInclude,
      });
      const remaining = await this.findSiblings(tx, current.mixing_activity_template_stage_id);
      await compactTemplateOrders(remaining.map((node) => ({ id: node.id, order: node.step_order })),
        (nodeId, order) => tx.mixingActivityTemplateStageSteps.update({ where: { id: nodeId }, data: { step_order: order } }));
      return { ...deleted, siblings: await this.findSiblings(tx, current.mixing_activity_template_stage_id) };
    });
  }

  async move(id: number, direction: unknown) {
    validateMoveDirection(direction);
    return mutateTemplateStructure(this.prismaService, { kind: 'step', id }, async (tx) => {
      const current = await this.findById(id, tx);
      const siblings = await this.findSiblings(tx, current.mixing_activity_template_stage_id);
      await moveTemplateNode(siblings.map((node) => ({ id: node.id, order: node.step_order })), id, direction,
        (nodeId, order) => tx.mixingActivityTemplateStageSteps.update({ where: { id: nodeId }, data: { step_order: order } }));
      return { ...await this.findById(id, tx), siblings: await this.findSiblings(tx, current.mixing_activity_template_stage_id) };
    });
  }

  async duplicate(id: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(this.prismaService, { kind: 'step', id }, async (tx) => {
      const source = await tx.mixingActivityTemplateStageSteps.findUnique({
        where: { id }, include: { ...mixingActivityTemplateStageStepInclude,
        parameters: { orderBy: { parameter_order: 'asc' as const }, include: { createdBy: { select: creatorSelect } } },
      },
      });
      if (!source) throw new NotFoundException('Mixing activity template step not found');
      const siblings = await this.findSiblings(tx, source.mixing_activity_template_stage_id);
      const order = source.step_order + 1;
      await shiftTemplateOrdersForInsert(siblings.map((node) => ({ id: node.id, order: node.step_order })), order,
        (nodeId, nextOrder) => tx.mixingActivityTemplateStageSteps.update({ where: { id: nodeId }, data: { step_order: nextOrder } }));
      const created = await tx.mixingActivityTemplateStageSteps.create({
        data: {
          mixing_activity_template_stage_id: source.mixing_activity_template_stage_id,
          step_name: source.step_name,
          parameters: { create: source.parameters.map((parameter) => ({
            parameter_name: parameter.parameter_name,
            data_type: parameter.data_type,
            unit: parameter.unit,
            requirement: parameter.requirement,
            parameter_order: parameter.parameter_order,
            created_by_id: userId,
          })) },
          step_order: order,
          created_by_id: userId,
        },
        include: { ...mixingActivityTemplateStageStepInclude,
        parameters: { orderBy: { parameter_order: 'asc' as const }, include: { createdBy: { select: creatorSelect } } },
      },
      });
      return { ...created, siblings: await this.findSiblings(tx, source.mixing_activity_template_stage_id) };
    });
  }

  private findSiblings(tx: Prisma.TransactionClient, parentId: number) {
    return tx.mixingActivityTemplateStageSteps.findMany({
      where: { mixing_activity_template_stage_id: parentId },
      include: mixingActivityTemplateStageStepInclude,
      orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
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

  private async ensureStageExists(stageId: number, client: Prisma.TransactionClient = this.prismaService) {
    const stage =
      await client.mixingActivityTemplateStages.findUnique({
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
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const existing =
      await client.mixingActivityTemplateStageSteps.findUnique({
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
