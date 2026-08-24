import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderMixingRecordDto } from './dto/create-production-order-mixing-record.dto';
import { CreateProductionOrderMixingRecordParameterDto } from './dto/create-production-order-mixing-record-parameter.dto';
import { CreateProductionOrderMixingRecordStageDto } from './dto/create-production-order-mixing-record-stage.dto';
import { CreateProductionOrderMixingRecordStepDto } from './dto/create-production-order-mixing-record-step.dto';
import { UpdateProductionOrderMixingRecordParameterDto } from './dto/update-production-order-mixing-record-parameter.dto';
import { UpdateProductionOrderMixingRecordParameterResultDto } from './dto/update-production-order-mixing-record-parameter-result.dto';
import { UpdateProductionOrderMixingRecordStageDto } from './dto/update-production-order-mixing-record-stage.dto';
import { UpdateProductionOrderMixingRecordStepDto } from './dto/update-production-order-mixing-record-step.dto';
import {
  getProductionOrderMixingRecordParameterImagePath,
  removeProductionOrderMixingRecordParameterImageByPath,
  resolveProductionOrderMixingRecordParameterImageFile,
} from './production-order-mixing-record-parameter-upload.config';

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
  qaStaffApprovedBy: { select: userSelect },
  qaManagerApprovedBy: { select: userSelect },
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

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.productionOrderMixingRecords.delete({
      where: { id },
      include: mixingRecordInclude,
    });
  }

  async approveByQaStaff(id: number, user?: AuthenticatedUser) {
    await this.ensureMixingRecordExists(id);

    return this.prismaService.productionOrderMixingRecords.update({
      where: { id },
      data: {
        qa_staff_approved_by_id: this.normalizeUserId(user),
        qa_staff_approved_at: new Date(),
      },
      include: mixingRecordInclude,
    });
  }

  async approveByQaManager(id: number, user?: AuthenticatedUser) {
    await this.ensureMixingRecordExists(id);

    return this.prismaService.productionOrderMixingRecords.update({
      where: { id },
      data: {
        qa_manager_approved_by_id: this.normalizeUserId(user),
        qa_manager_approved_at: new Date(),
      },
      include: mixingRecordInclude,
    });
  }

  async createStage(
    recordId: number,
    dto: CreateProductionOrderMixingRecordStageDto,
  ) {
    await this.ensureMixingRecordExists(recordId);
    const stageOrder = this.normalizePositiveInteger(
      dto?.stage_order,
      'stage_order',
    );
    await this.ensureStageOrderAvailable(recordId, stageOrder);

    return this.prismaService.productionOrderMixingRecordStages.create({
      data: {
        production_order_mixing_record_id: recordId,
        stage_name: this.normalizeRequiredText(
          dto?.stage_name,
          'stage_name',
          255,
        ),
        stage_order: stageOrder,
      },
    });
  }

  async updateStage(
    stageId: number,
    dto: UpdateProductionOrderMixingRecordStageDto,
  ) {
    const stage = await this.findStageOrThrow(stageId);
    const data: Prisma.ProductionOrderMixingRecordStagesUncheckedUpdateInput =
      {};

    if ('stage_name' in (dto ?? {})) {
      data.stage_name = this.normalizeRequiredText(
        dto.stage_name,
        'stage_name',
        255,
      );
    }
    if ('stage_order' in (dto ?? {})) {
      data.stage_order = this.normalizePositiveInteger(
        dto.stage_order,
        'stage_order',
      );
    }
    this.ensureUpdateData(data);

    if (typeof data.stage_order === 'number') {
      await this.ensureStageOrderAvailable(
        stage.production_order_mixing_record_id,
        data.stage_order,
        stageId,
      );
    }

    return this.prismaService.productionOrderMixingRecordStages.update({
      where: { id: stageId },
      data,
    });
  }

  async deleteStage(stageId: number) {
    await this.findStageOrThrow(stageId);
    return this.prismaService.productionOrderMixingRecordStages.delete({
      where: { id: stageId },
    });
  }

  async createStep(
    stageId: number,
    dto: CreateProductionOrderMixingRecordStepDto,
  ) {
    await this.findStageOrThrow(stageId);
    const stepOrder = this.normalizePositiveInteger(
      dto?.step_order,
      'step_order',
    );
    await this.ensureStepOrderAvailable(stageId, stepOrder);

    return this.prismaService.productionOrderMixingRecordSteps.create({
      data: {
        production_order_mixing_record_stage_id: stageId,
        step_name: this.normalizeRequiredText(dto?.step_name, 'step_name', 255),
        step_order: stepOrder,
      },
    });
  }

  async updateStep(
    stepId: number,
    dto: UpdateProductionOrderMixingRecordStepDto,
  ) {
    const step = await this.findStepOrThrow(stepId);
    const data: Prisma.ProductionOrderMixingRecordStepsUncheckedUpdateInput =
      {};

    if ('step_name' in (dto ?? {})) {
      data.step_name = this.normalizeRequiredText(
        dto.step_name,
        'step_name',
        255,
      );
    }
    if ('step_order' in (dto ?? {})) {
      data.step_order = this.normalizePositiveInteger(
        dto.step_order,
        'step_order',
      );
    }
    this.ensureUpdateData(data);

    if (typeof data.step_order === 'number') {
      await this.ensureStepOrderAvailable(
        step.production_order_mixing_record_stage_id,
        data.step_order,
        stepId,
      );
    }

    return this.prismaService.productionOrderMixingRecordSteps.update({
      where: { id: stepId },
      data,
    });
  }

  async deleteStep(stepId: number) {
    await this.findStepOrThrow(stepId);
    return this.prismaService.productionOrderMixingRecordSteps.delete({
      where: { id: stepId },
    });
  }

  async createParameter(
    stepId: number,
    dto: CreateProductionOrderMixingRecordParameterDto,
  ) {
    await this.findStepOrThrow(stepId);
    const parameterOrder = this.normalizePositiveInteger(
      dto?.parameter_order,
      'parameter_order',
    );
    await this.ensureParameterOrderAvailable(stepId, parameterOrder);

    return this.prismaService.productionOrderMixingRecordParameters.create({
      data: {
        production_order_mixing_record_step_id: stepId,
        parameter_name: this.normalizeRequiredText(
          dto?.parameter_name,
          'parameter_name',
          255,
        ),
        data_type: this.normalizeDataType(dto?.data_type),
        unit: this.normalizeOptionalText(dto?.unit, 'unit', 50),
        requirement: this.normalizeRequiredText(
          dto?.requirement,
          'requirement',
        ),
        parameter_order: parameterOrder,
      },
      include: { recordedBy: { select: userSelect } },
    });
  }

  async updateParameter(
    parameterId: number,
    dto: UpdateProductionOrderMixingRecordParameterDto,
  ) {
    const parameter = await this.findParameterOrThrow(parameterId);
    const data: Prisma.ProductionOrderMixingRecordParametersUncheckedUpdateInput =
      {};
    const updateDto = dto ?? {};

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
    this.ensureUpdateData(data);

    if (typeof data.parameter_order === 'number') {
      await this.ensureParameterOrderAvailable(
        parameter.production_order_mixing_record_step_id,
        data.parameter_order,
        parameterId,
      );
    }

    return this.prismaService.productionOrderMixingRecordParameters.update({
      where: { id: parameterId },
      data,
      include: { recordedBy: { select: userSelect } },
    });
  }

  async deleteParameter(parameterId: number) {
    const parameter =
      await this.prismaService.productionOrderMixingRecordParameters.findUnique({
        where: { id: parameterId },
        select: { id: true, result_image_path: true },
      });
    if (!parameter) {
      throw new NotFoundException(
        'Production order mixing record parameter not found',
      );
    }

    const deleted =
      await this.prismaService.productionOrderMixingRecordParameters.delete({
      where: { id: parameterId },
      include: { recordedBy: { select: userSelect } },
    });
    await removeProductionOrderMixingRecordParameterImageByPath(
      parameter.result_image_path,
    );
    return deleted;
  }

  async updateParameterResult(
    parameterId: number,
    dto: UpdateProductionOrderMixingRecordParameterResultDto,
    user?: AuthenticatedUser,
  ) {
    if (
      !dto ||
      (!('result_value' in dto) &&
        !('note' in dto) &&
        !('result_image_path' in dto))
    ) {
      throw new BadRequestException(
        'result_value, note or result_image_path is required',
      );
    }

    const parameter =
      await this.prismaService.productionOrderMixingRecordParameters.findUnique(
        {
          where: { id: parameterId },
          select: { id: true, data_type: true, result_image_path: true },
        },
      );

    if (!parameter) {
      throw new NotFoundException(
        'Production order mixing record parameter not found',
      );
    }

    const data: Prisma.ProductionOrderMixingRecordParametersUncheckedUpdateInput =
      {};

    if ('result_value' in dto) {
      const resultValue = this.normalizeResultValue(
        dto.result_value,
        parameter.data_type,
      );
      if (resultValue === null) {
        data.result_value = null;
        data.recorded_by_id = null;
        data.recorded_at = null;
      } else {
        data.result_value = resultValue;
        data.recorded_by_id = this.normalizeUserId(user);
        data.recorded_at = new Date();
      }
    }

    if ('result_image_path' in dto) {
      data.result_image_path = this.normalizeOptionalText(
        dto.result_image_path,
        'result_image_path',
      );
    }

    if ('note' in dto) {
      data.note = this.normalizeOptionalText(dto.note, 'note');
    }

    const updated =
      await this.prismaService.productionOrderMixingRecordParameters.update({
      where: { id: parameterId },
      data,
      include: { recordedBy: { select: userSelect } },
    });

    if (
      'result_image_path' in dto &&
      parameter.result_image_path !== updated.result_image_path
    ) {
      await removeProductionOrderMixingRecordParameterImageByPath(
        parameter.result_image_path,
      );
    }

    return updated;
  }

  async uploadParameterImage(
    parameterId: number,
    file: Express.Multer.File,
  ) {
    const imagePath = getProductionOrderMixingRecordParameterImagePath(file);
    if (!imagePath) {
      throw new BadRequestException('image is required');
    }

    const parameter =
      await this.prismaService.productionOrderMixingRecordParameters.findUnique({
        where: { id: parameterId },
        select: { id: true, result_image_path: true },
      });
    if (!parameter) {
      throw new NotFoundException(
        'Production order mixing record parameter not found',
      );
    }

    const updated =
      await this.prismaService.productionOrderMixingRecordParameters.update({
        where: { id: parameterId },
        data: { result_image_path: imagePath },
        include: { recordedBy: { select: userSelect } },
      });
    await removeProductionOrderMixingRecordParameterImageByPath(
      parameter.result_image_path,
    );

    return updated;
  }

  async findParameterImageFile(filename: string) {
    return resolveProductionOrderMixingRecordParameterImageFile(filename);
  }

  private async ensureMixingRecordExists(recordId: number) {
    const record =
      await this.prismaService.productionOrderMixingRecords.findUnique({
        where: { id: recordId },
        select: { id: true },
      });

    if (!record) {
      throw new NotFoundException('Production order mixing record not found');
    }
  }

  private async findStageOrThrow(stageId: number) {
    const stage =
      await this.prismaService.productionOrderMixingRecordStages.findUnique({
        where: { id: stageId },
        select: { id: true, production_order_mixing_record_id: true },
      });

    if (!stage) {
      throw new NotFoundException(
        'Production order mixing record stage not found',
      );
    }

    return stage;
  }

  private async findStepOrThrow(stepId: number) {
    const step =
      await this.prismaService.productionOrderMixingRecordSteps.findUnique({
        where: { id: stepId },
        select: { id: true, production_order_mixing_record_stage_id: true },
      });

    if (!step) {
      throw new NotFoundException(
        'Production order mixing record step not found',
      );
    }

    return step;
  }

  private async findParameterOrThrow(parameterId: number) {
    const parameter =
      await this.prismaService.productionOrderMixingRecordParameters.findUnique(
        {
          where: { id: parameterId },
          select: {
            id: true,
            production_order_mixing_record_step_id: true,
          },
        },
      );

    if (!parameter) {
      throw new NotFoundException(
        'Production order mixing record parameter not found',
      );
    }

    return parameter;
  }

  private async ensureStageOrderAvailable(
    recordId: number,
    stageOrder: number,
    excludedStageId?: number,
  ) {
    const existing =
      await this.prismaService.productionOrderMixingRecordStages.findUnique({
        where: {
          production_order_mixing_record_id_stage_order: {
            production_order_mixing_record_id: recordId,
            stage_order: stageOrder,
          },
        },
        select: { id: true },
      });

    if (existing && existing.id !== excludedStageId) {
      throw new ConflictException(
        'Stage order already exists for this production order mixing record',
      );
    }
  }

  private async ensureStepOrderAvailable(
    stageId: number,
    stepOrder: number,
    excludedStepId?: number,
  ) {
    const existing =
      await this.prismaService.productionOrderMixingRecordSteps.findUnique({
        where: {
          production_order_mixing_record_stage_id_step_order: {
            production_order_mixing_record_stage_id: stageId,
            step_order: stepOrder,
          },
        },
        select: { id: true },
      });

    if (existing && existing.id !== excludedStepId) {
      throw new ConflictException(
        'Step order already exists for this production order mixing record stage',
      );
    }
  }

  private async ensureParameterOrderAvailable(
    stepId: number,
    parameterOrder: number,
    excludedParameterId?: number,
  ) {
    const existing =
      await this.prismaService.productionOrderMixingRecordParameters.findUnique(
        {
          where: {
            production_order_mixing_record_step_id_parameter_order: {
              production_order_mixing_record_step_id: stepId,
              parameter_order: parameterOrder,
            },
          },
          select: { id: true },
        },
      );

    if (existing && existing.id !== excludedParameterId) {
      throw new ConflictException(
        'Parameter order already exists for this production order mixing record step',
      );
    }
  }

  private ensureUpdateData(data: object) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }
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
