import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderMixingRecordDto } from './dto/create-production-order-mixing-record.dto';
import { UpdateProductionOrderMixingRecordParameterResultDto } from './dto/update-production-order-mixing-record-parameter-result.dto';

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

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const mixingRecordInclude = {
  createdBy: { select: userSelect },
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    include: {
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        include: {
          parameters: {
            orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
            include: { recordedBy: { select: userSelect } },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductionOrderMixingRecordsInclude;

const mixingTemplateInclude = {
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    include: {
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        include: {
          parameters: { orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }] },
        },
      },
    },
  },
} satisfies Prisma.MixingActivityTemplatesInclude;

@Injectable()
export class ProductionOrderMixingRecordsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByProductionOrder(productionOrderId: number) {
    await this.findProductionOrderOrThrow(productionOrderId);

    return this.prismaService.productionOrderMixingRecords.findMany({
      where: { production_order_id: productionOrderId },
      include: mixingRecordInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const mixingRecord =
      await this.prismaService.productionOrderMixingRecords.findUnique({
        where: { id },
        include: mixingRecordInclude,
      });

    if (!mixingRecord) {
      throw new NotFoundException('Production order mixing record not found');
    }

    return mixingRecord;
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderMixingRecordDto,
    user?: AuthenticatedUser,
  ) {
    const productionOrder =
      await this.findProductionOrderOrThrow(productionOrderId);
    const templateId = this.normalizePositiveInteger(
      dto?.mixing_activity_template_id,
      'mixing_activity_template_id',
    );
    const template =
      await this.prismaService.mixingActivityTemplates.findUnique({
        where: { id: templateId },
        include: mixingTemplateInclude,
      });

    if (!template) {
      throw new NotFoundException('Mixing activity template not found');
    }

    if (template.item_code !== productionOrder.item_code) {
      throw new BadRequestException(
        'Mixing activity template does not belong to production order item',
      );
    }

    return this.prismaService.productionOrderMixingRecords.create({
      data: {
        production_order_id: productionOrderId,
        mixing_activity_template_id: template.id,
        template_version: String(template.version),
        created_by_id: this.normalizeUserId(user),
        stages: {
          create: template.stages.map((stage) => ({
            source_template_stage_id: stage.id,
            stage_name: stage.stage_name,
            stage_order: stage.stage_order,
            steps: {
              create: stage.steps.map((step) => ({
                source_template_step_id: step.id,
                step_name: step.step_name,
                step_order: step.step_order,
                parameters: {
                  create: step.parameters.map((parameter) => ({
                    source_template_parameter_id: parameter.id,
                    parameter_name: parameter.parameter_name,
                    data_type: parameter.data_type,
                    unit: parameter.unit,
                    requirement: parameter.requirement,
                    parameter_order: parameter.parameter_order,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: mixingRecordInclude,
    });
  }

  async updateParameterResult(
    parameterId: number,
    dto: UpdateProductionOrderMixingRecordParameterResultDto,
    user?: AuthenticatedUser,
  ) {
    if (!dto || !('result_value' in dto)) {
      throw new BadRequestException('result_value is required');
    }

    const parameter =
      await this.prismaService.productionOrderMixingRecordParameters.findUnique(
        {
          where: { id: parameterId },
          select: { id: true, data_type: true },
        },
      );

    if (!parameter) {
      throw new NotFoundException(
        'Production order mixing record parameter not found',
      );
    }

    const resultValue = this.normalizeResultValue(
      dto.result_value,
      parameter.data_type,
    );
    const data: Prisma.ProductionOrderMixingRecordParametersUncheckedUpdateInput =
      resultValue === null
        ? {
            result_value: null,
            recorded_by_id: null,
            recorded_at: null,
          }
        : {
            result_value: resultValue,
            recorded_by_id: this.normalizeUserId(user),
            recorded_at: new Date(),
          };

    return this.prismaService.productionOrderMixingRecordParameters.update({
      where: { id: parameterId },
      data,
      include: { recordedBy: { select: userSelect } },
    });
  }

  private async findProductionOrderOrThrow(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true, item_code: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }

    return productionOrder;
  }

  private normalizePositiveInteger(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private normalizeResultValue(value: unknown, dataType: string) {
    if (value === null || value === '') {
      return null;
    }

    if (!DATA_TYPES.includes(dataType as (typeof DATA_TYPES)[number])) {
      throw new BadRequestException('Unsupported parameter data_type');
    }

    if (dataType === 'text' || dataType === 'select') {
      const normalizedValue = String(value).trim();
      if (!normalizedValue) {
        throw new BadRequestException('result_value must not be empty');
      }
      return normalizedValue;
    }

    if (dataType === 'number' || dataType === 'decimal') {
      const normalizedValue = Number(value);
      if (!Number.isFinite(normalizedValue)) {
        throw new BadRequestException('result_value must be a number');
      }
      return String(normalizedValue);
    }

    if (dataType === 'boolean') {
      if (value === true || value === 'true') {
        return 'true';
      }
      if (value === false || value === 'false') {
        return 'false';
      }
      throw new BadRequestException('result_value must be a boolean');
    }

    const normalizedDate = new Date(String(value));
    if (Number.isNaN(normalizedDate.getTime())) {
      throw new BadRequestException('result_value must be a valid date');
    }

    return normalizedDate.toISOString();
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
