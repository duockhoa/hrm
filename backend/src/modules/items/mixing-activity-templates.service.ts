import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateMixingActivityTemplateDto } from './dto/create-mixing-activity-template.dto';
import { CopyMixingActivityTemplateDto } from './dto/copy-mixing-activity-template.dto';
import { UpdateMixingActivityTemplateDto } from './dto/update-mixing-activity-template.dto';

type AuthenticatedUser = { id?: number | string | null };

const ACTIVE_MIXING_ACTIVITY_TEMPLATE_STATUS = 'active';
const INACTIVE_MIXING_ACTIVITY_TEMPLATE_STATUS = 'inactive';

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const mixingActivityTemplateInclude = {
  item: {
    select: {
      item_code: true,
      item_name: true,
      unit: true,
      dk_code: true,
      registration_id: true,
      created_at: true,
      update_at: true,
    },
  },
  createdBy: { select: creatorSelect },
} satisfies Prisma.MixingActivityTemplatesInclude;

@Injectable()
export class MixingActivityTemplatesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.mixingActivityTemplates.findMany({
      include: mixingActivityTemplateInclude,
      orderBy: [{ item_code: 'asc' }, { version: 'desc' }, { id: 'desc' }],
    });
  }

  async findAllByItem(itemCode: string) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    await this.ensureItemExists(normalizedItemCode);

    return this.prismaService.mixingActivityTemplates.findMany({
      where: { item_code: normalizedItemCode },
      include: mixingActivityTemplateInclude,
      orderBy: [{ version: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number, includeTree = true) {
    const template =
      await this.prismaService.mixingActivityTemplates.findUnique({
        where: { id },
        include: {
          ...mixingActivityTemplateInclude,
          ...(includeTree
            ? ({
                stages: {
                  orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
                  include: {
                    createdBy: { select: creatorSelect },
                    steps: {
                      orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
                      include: {
                        createdBy: { select: creatorSelect },
                        parameters: {
                          orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
                          include: { createdBy: { select: creatorSelect } },
                        },
                      },
                    },
                  },
                },
              } satisfies Prisma.MixingActivityTemplatesInclude)
            : {}),
        },
      });

    if (!template) {
      throw new NotFoundException('Mixing activity template not found');
    }

    return template;
  }

  async create(
    itemCode: string,
    dto: CreateMixingActivityTemplateDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    await this.ensureItemExists(normalizedItemCode);

    return this.prismaService.mixingActivityTemplates.create({
      data: {
        item_code: normalizedItemCode,
        version: this.normalizePositiveInteger(dto?.version ?? 1, 'version'),
        batch_size: this.normalizePositiveNumber(dto?.batch_size, 'batch_size'),
        unit_of_measure: this.normalizeRequiredString(
          dto?.unit_of_measure,
          'unit_of_measure',
          50,
        ),
        description: this.normalizeDescription(dto?.description),
        status: ACTIVE_MIXING_ACTIVITY_TEMPLATE_STATUS,
        created_by_id: this.normalizeUserId(user),
      },
      include: mixingActivityTemplateInclude,
    });
  }

  async copyFromTemplate(
    itemCode: string,
    dto: CopyMixingActivityTemplateDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    const sourceTemplateId = this.normalizePositiveInteger(
      dto?.source_template_id,
      'source_template_id',
    );
    const userId = this.normalizeUserId(user);

    return this.prismaService.$transaction(
      async (tx) => {
        await this.ensureItemExists(normalizedItemCode, tx);
        const source = await tx.mixingActivityTemplates.findUnique({
          where: { id: sourceTemplateId },
          include: {
            stages: {
              orderBy: { stage_order: 'asc' },
              include: {
                steps: {
                  orderBy: { step_order: 'asc' },
                  include: {
                    parameters: { orderBy: { parameter_order: 'asc' } },
                  },
                },
              },
            },
          },
        });
        if (!source) {
          throw new NotFoundException(
            'Source mixing activity template not found',
          );
        }

        const latestVersion =
          dto.version == null
            ? await tx.mixingActivityTemplates.aggregate({
                where: { item_code: normalizedItemCode },
                _max: { version: true },
              })
            : null;
        const batchSize = this.normalizePositiveNumber(
          dto.batch_size === undefined ? source.batch_size : dto.batch_size,
          'batch_size',
        );
        const unitOfMeasure = this.normalizeRequiredString(
          dto.unit_of_measure === undefined
            ? source.unit_of_measure
            : dto.unit_of_measure,
          'unit_of_measure',
          50,
        );
        const sourceBatchSize = new Prisma.Decimal(source.batch_size);
        const scaleFactor =
          source.item_code === normalizedItemCode &&
          source.unit_of_measure.trim() === unitOfMeasure &&
          sourceBatchSize.greaterThan(0) &&
          !sourceBatchSize.equals(batchSize)
            ? new Prisma.Decimal(batchSize).div(sourceBatchSize)
            : null;
        const description = this.scaleNumericPlaceholders(
          this.normalizeDescription(
            dto.description === undefined
              ? source.description
              : dto.description,
          ),
          scaleFactor,
        );

        // A nested create writes the entire tree atomically with new IDs.
        return tx.mixingActivityTemplates.create({
          data: {
            item_code: normalizedItemCode,
            version: this.normalizePositiveInteger(
              dto.version ?? (latestVersion?._max.version ?? 0) + 1,
              'version',
            ),
            batch_size: batchSize,
            unit_of_measure: unitOfMeasure,
            description,
            status: ACTIVE_MIXING_ACTIVITY_TEMPLATE_STATUS,
            created_by_id: userId,
            stages: {
              create: source.stages.map((stage) => ({
                stage_name: this.scaleNumericPlaceholders(
                  stage.stage_name,
                  scaleFactor,
                ),
                stage_order: stage.stage_order,
                created_by_id: userId,
                steps: {
                  create: stage.steps.map((step) => ({
                    step_name: this.scaleNumericPlaceholders(
                      step.step_name,
                      scaleFactor,
                    ),
                    step_order: step.step_order,
                    created_by_id: userId,
                    parameters: {
                      create: step.parameters.map((parameter) => ({
                        parameter_name: this.scaleNumericPlaceholders(
                          parameter.parameter_name,
                          scaleFactor,
                        ),
                        data_type: parameter.data_type,
                        unit: this.scaleNumericPlaceholders(
                          parameter.unit,
                          scaleFactor,
                        ),
                        requirement: this.scaleNumericPlaceholders(
                          parameter.requirement,
                          scaleFactor,
                        ),
                        parameter_order: parameter.parameter_order,
                        created_by_id: userId,
                      })),
                    },
                  })),
                },
              })),
            },
          },
          include: mixingActivityTemplateInclude,
        });
      },
      { timeout: 30000 },
    );
  }

  async update(id: number, dto: UpdateMixingActivityTemplateDto) {
    await this.findById(id, false);
    const data = this.normalizeUpdateData(dto);

    return this.prismaService.mixingActivityTemplates.update({
      where: { id },
      data,
      include: mixingActivityTemplateInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id, false);

    return this.prismaService.mixingActivityTemplates.delete({
      where: { id },
      include: mixingActivityTemplateInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateMixingActivityTemplateDto) {
    const updateDto = dto ?? {};
    const data: Prisma.MixingActivityTemplatesUpdateInput = {};

    if ('version' in updateDto) {
      data.version = this.normalizePositiveInteger(
        updateDto.version,
        'version',
      );
    }

    if ('batch_size' in updateDto) {
      data.batch_size = this.normalizePositiveNumber(
        updateDto.batch_size,
        'batch_size',
      );
    }

    if ('unit_of_measure' in updateDto) {
      data.unit_of_measure = this.normalizeRequiredString(
        updateDto.unit_of_measure,
        'unit_of_measure',
        50,
      );
    }

    if ('description' in updateDto) {
      data.description = this.normalizeDescription(updateDto.description);
    }

    if ('status' in updateDto) {
      data.status = this.normalizeStatus(updateDto.status);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeItemCode(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('item_code is required');
    }

    return value.trim();
  }

  private normalizePositiveInteger(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private normalizePositiveNumber(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }

    return normalizedValue;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeDescription(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue || null;
  }

  private scaleNumericPlaceholders<T extends string | null>(
    value: T,
    scaleFactor: Prisma.Decimal | null,
  ): T {
    if (value === null || scaleFactor === null) {
      return value;
    }

    return value.replace(
      /\{\{\s*(-?\d+(?:[.,]\d+)?)\s*\}\}/g,
      (_, rawNumber: string) => {
        const scaledValue = new Prisma.Decimal(rawNumber.replace(',', '.'))
          .mul(scaleFactor)
          .toFixed();
        const formattedValue = rawNumber.includes(',')
          ? scaledValue.replace('.', ',')
          : scaledValue;

        return `{{${formattedValue}}}`;
      },
    ) as T;
  }

  private normalizeStatus(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('status must be active or inactive');
    }

    const normalizedValue = value.trim().toLowerCase();
    if (
      normalizedValue !== ACTIVE_MIXING_ACTIVITY_TEMPLATE_STATUS &&
      normalizedValue !== INACTIVE_MIXING_ACTIVITY_TEMPLATE_STATUS
    ) {
      throw new BadRequestException('status must be active or inactive');
    }

    return normalizedValue;
  }

  private async ensureItemExists(
    itemCode: string,
    client: Pick<Prisma.TransactionClient, 'items'> = this.prismaService,
  ) {
    const item = await client.items.findUnique({
      where: { item_code: itemCode },
      select: { item_code: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
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
