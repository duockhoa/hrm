import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateItemFeatureDto } from './dto/create-item-feature.dto';
import { CopyItemFeatureConfigDto } from './dto/copy-item-feature-config.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { UpdateItemFeatureDto } from './dto/update-item-feature.dto';
import {
  assertRequiredSection,
  buildItemFeatureConfig,
  buildCurrentItemFeatureConfig,
  deriveSectionActivation,
} from './item-feature-config';
import { supportsRequiredSection } from '../production-orders/production-order-section-rules';

const FEATURE_LINK_INCLUDE = {
  sourceActions: {
    include: { action: true },
    orderBy: { order: 'asc' as const },
  },
  targetSections: {
    include: { section: true },
    orderBy: { section_id: 'asc' as const },
  },
} satisfies Prisma.FeaturesInclude;

const linkedActions = (feature: {
  sourceActions?: {
    action: { id: number; key: string; label: string };
    order: number;
  }[];
}) =>
  feature.sourceActions?.map(({ action, order }) => ({
    ...actionReference(action),
    order,
  }));
const actionReference = (feature: {
  id: number;
  key: string;
  label: string;
}) => ({ id: feature.id, key: feature.key, label: feature.label });

const featureLinks = (feature: {
  sourceActions?: {
    action: { id: number; key: string; label: string };
    order: number;
  }[];
  targetSections?: { section: { id: number; key: string; label: string } }[];
}) => ({
  source_actions: linkedActions(feature) ?? [],
  target_sections:
    feature.targetSections?.map(({ section }) => actionReference(section)) ??
    [],
});

const ITEM_FEATURE_INCLUDE = {
  feature: { include: FEATURE_LINK_INCLUDE },
  item: true,
} satisfies Prisma.ItemFeaturesInclude;

@Injectable()
export class FeaturesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    const features = await this.prismaService.features.findMany({
      orderBy: [{ default_order: 'asc' }, { key: 'asc' }],
      include: FEATURE_LINK_INCLUDE,
    });
    return features.map((feature) => ({
      ...feature,
      source_actions: linkedActions(feature) ?? [],
      target_sections:
        feature.targetSections?.map(({ section }) =>
          actionReference(section),
        ) ?? [],
      supports_required:
        feature.kind === 'action' &&
        (feature.targetSections ?? []).some(({ section }) =>
          supportsRequiredSection(section.key),
        ),
    }));
  }

  async findById(id: number) {
    const feature = await this.prismaService.features.findUnique({
      where: { id },
      include: {
        itemFeatures: true,
        ...FEATURE_LINK_INCLUDE,
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return {
      ...feature,
      source_actions: linkedActions(feature) ?? [],
      target_sections:
        feature.targetSections?.map(({ section }) =>
          actionReference(section),
        ) ?? [],
    };
  }

  async findByKey(key: string) {
    const normalizedKey = this.normalizeRequiredString(key, 'key');
    const feature = await this.prismaService.features.findUnique({
      where: { key: normalizedKey },
      include: {
        itemFeatures: true,
        ...FEATURE_LINK_INCLUDE,
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return {
      ...feature,
      source_actions: linkedActions(feature) ?? [],
      target_sections:
        feature.targetSections?.map(({ section }) =>
          actionReference(section),
        ) ?? [],
    };
  }

  async create(createDto: CreateFeatureDto) {
    const data = this.buildCreateFeatureData(createDto);

    const existing = await this.prismaService.features.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new ConflictException('Feature key already exists');
    }

    return this.prismaService
      .$transaction(
        async (tx) => {
          const actionIds = await this.validateActionIds(
            createDto.action_ids,
            data.kind,
            tx,
          );
          const feature = await tx.features.create({
            data: {
              ...data,
              ...(actionIds === undefined
                ? {}
                : {
                    sourceActions: {
                      create: actionIds.map((action_id, order) => ({
                        action_id,
                        order,
                      })),
                    },
                  }),
            },
            include: FEATURE_LINK_INCLUDE,
          });
          return { ...feature, ...featureLinks(feature) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => this.handleFeatureWriteError(error));
  }

  async update(id: number, updateDto: UpdateFeatureDto) {
    return this.prismaService
      .$transaction(
        async (tx) => {
          const existing = await tx.features.findUnique({
            where: { id },
            include: { itemFeatures: true, ...FEATURE_LINK_INCLUDE },
          });
          if (!existing) throw new NotFoundException('Feature not found');
          const data = await this.buildUpdateFeatureData(id, updateDto, tx);
          const nextKind =
            typeof data.kind === 'string' ? data.kind : existing.kind;
          const actionIds = await this.validateActionIds(
            updateDto.action_ids,
            nextKind,
            tx,
            id,
          );
          if (actionIds?.includes(id)) {
            throw new BadRequestException(
              'A section cannot reference itself as a source action.',
            );
          }
          if (
            nextKind !== existing.kind &&
            ((existing.sourceActions?.length &&
              (actionIds === undefined || actionIds.length > 0)) ||
              existing.targetSections?.length)
          ) {
            throw new BadRequestException(
              'Remove section/action links before changing feature kind.',
            );
          }
          if (existing.itemFeatures.some((setting) => setting.required)) {
            const nextFeature = {
              key: typeof data.key === 'string' ? data.key : existing.key,
              kind: nextKind,
            };
            if (nextFeature.kind === 'action') {
              this.assertRequiredAction(
                nextFeature,
                true,
                existing.targetSections ?? [],
              );
            } else {
              assertRequiredSection(
                nextFeature,
                true,
                true,
                supportsRequiredSection(nextFeature.key),
              );
            }
          }
          const feature = await tx.features.update({
            where: { id },
            data: {
              ...data,
              ...(actionIds === undefined
                ? {}
                : {
                    sourceActions: {
                      deleteMany: {},
                      create: actionIds.map((action_id, order) => ({
                        action_id,
                        order,
                      })),
                    },
                  }),
            },
            include: FEATURE_LINK_INCLUDE,
          });
          return { ...feature, ...featureLinks(feature) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => this.handleFeatureWriteError(error));
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.features.delete({
      where: { id },
    });
  }

  async findByItemCode(
    item_code: string,
    includeDisabled?: string,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    await this.ensureItemExists(normalizedItemCode, client);

    const shouldIncludeDisabled =
      this.normalizeOptionalBoolean(includeDisabled, 'includeDisabled') ??
      false;

    return client.itemFeatures.findMany({
      where: {
        item_code: normalizedItemCode,
        ...(shouldIncludeDisabled ? {} : { enabled: true }),
      },
      include: ITEM_FEATURE_INCLUDE,
      orderBy: [{ order: 'asc' }, { feature: { default_order: 'asc' } }],
    });
  }

  async findConfigByItemCode(
    item_code: string,
    includeDisabled?: string,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const itemFeatures = await this.findByItemCode(item_code, 'true', client);
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    const catalog = await client.features.findMany({
      include: FEATURE_LINK_INCLUDE,
      orderBy: [{ default_order: 'asc' }, { key: 'asc' }],
    });
    const shouldIncludeDisabled =
      this.normalizeOptionalBoolean(includeDisabled, 'includeDisabled') ??
      false;

    return buildCurrentItemFeatureConfig(
      normalizedItemCode,
      catalog,
      itemFeatures,
      shouldIncludeDisabled,
    );
  }

  async upsertItemFeature(item_code: string, createDto: CreateItemFeatureDto) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    await this.ensureItemExists(normalizedItemCode);
    const feature = await this.findFeatureFromDto(createDto);
    // Section rows store only order/required preferences; activation is derived
    // from the linked actions when the configuration is read.
    if (feature.kind === 'section')
      createDto = { ...createDto, enabled: true, required: false };
    const updateData = this.buildItemFeatureUpdateData(createDto, true);
    const createData = this.buildItemFeatureCreateData(createDto);
    if (updateData.required === true) {
      const existing = await this.prismaService.itemFeatures.findUnique({
        where: {
          item_code_feature_id: {
            item_code: normalizedItemCode,
            feature_id: feature.id,
          },
        },
      });
      const enabled = (updateData.enabled ??
        existing?.enabled ??
        true) as boolean;
      this.assertRequiredAction(feature, enabled, feature.targetSections ?? []);
      // Write enabled together with required to preserve the invariant even
      // when another request toggles the section concurrently.
      updateData.enabled = enabled;
    }

    return this.prismaService.itemFeatures.upsert({
      where: {
        item_code_feature_id: {
          item_code: normalizedItemCode,
          feature_id: feature.id,
        },
      },
      update: updateData,
      create: {
        item_code: normalizedItemCode,
        feature_id: feature.id,
        ...createData,
      },
      include: ITEM_FEATURE_INCLUDE,
    });
  }

  /**
   * Replaces a target item's feature configuration with a snapshot of a source
   * item. Keeping the reads and writes in one transaction prevents a partially
   * copied configuration when a request fails midway through the operation.
   */
  async copyItemFeatureConfig(
    item_code: string,
    copyDto: CopyItemFeatureConfigDto,
  ) {
    const targetItemCode = this.normalizeRequiredString(item_code, 'item_code');
    const sourceItemCode = this.normalizeRequiredString(
      copyDto.source_item_code,
      'source_item_code',
    );

    if (
      sourceItemCode.toLocaleLowerCase() === targetItemCode.toLocaleLowerCase()
    ) {
      throw new BadRequestException(
        'source_item_code must be different from item_code',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      const [sourceItem, targetItem, features, sourceItemFeatures] =
        await Promise.all([
          tx.items.findFirst({
            where: { item_code: sourceItemCode, deleted_at: null },
          }),
          tx.items.findFirst({
            where: { item_code: targetItemCode, deleted_at: null },
          }),
          tx.features.findMany({
            orderBy: [{ default_order: 'asc' }, { key: 'asc' }],
            include: FEATURE_LINK_INCLUDE,
          }),
          tx.itemFeatures.findMany({
            where: { item_code: sourceItemCode },
          }),
        ]);

      if (!sourceItem) {
        throw new NotFoundException('Source item not found');
      }

      if (!targetItem) {
        throw new NotFoundException('Item not found');
      }

      const sourceFeatureById = new Map(
        sourceItemFeatures.map((itemFeature) => [
          itemFeature.feature_id,
          itemFeature,
        ]),
      );
      const copiedFeatures = deriveSectionActivation(
        features.map((feature) => {
          const sourceFeature = sourceFeatureById.get(feature.id);

          return {
            feature_id: feature.id,
            key: feature.key,
            kind: feature.kind,
            label: feature.label,
            group_name: feature.group_name,
            source_actions: linkedActions(feature) ?? [],
            order: sourceFeature?.order ?? feature.default_order,
            enabled: sourceFeature?.enabled ?? false,
            required: Boolean(
              sourceFeature?.required &&
              sourceFeature.enabled &&
              feature.kind === 'action' &&
              (feature.targetSections ?? []).some(({ section }) =>
                supportsRequiredSection(section.key),
              ),
            ),
          };
        }),
      );

      await tx.itemFeatures.deleteMany({
        where: { item_code: targetItemCode },
      });

      if (copiedFeatures.length > 0) {
        await tx.itemFeatures.createMany({
          data: copiedFeatures.map(
            ({ feature_id, enabled, required, order }) => ({
              item_code: targetItemCode,
              feature_id,
              enabled,
              required,
              order,
            }),
          ),
        });
      }

      return buildItemFeatureConfig(targetItemCode, copiedFeatures);
    });
  }

  async updateItemFeature(
    item_code: string,
    feature_id: number,
    updateDto: UpdateItemFeatureDto,
  ) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    const existing = await this.ensureItemFeatureExists(
      normalizedItemCode,
      feature_id,
    );
    const feature = await this.findById(feature_id);
    if (feature.kind === 'section' && Object.keys(updateDto).length > 0) {
      updateDto = { ...updateDto, enabled: true, required: false };
    }
    const data = this.buildItemFeatureUpdateData(updateDto, false);
    if (data.required === true) {
      const enabled = (data.enabled ?? existing.enabled) as boolean;
      this.assertRequiredAction(feature, enabled, feature.targetSections ?? []);
      data.enabled = enabled;
    }

    return this.prismaService.itemFeatures.update({
      where: {
        item_code_feature_id: {
          item_code: normalizedItemCode,
          feature_id,
        },
      },
      data,
      include: ITEM_FEATURE_INCLUDE,
    });
  }

  async deleteItemFeature(item_code: string, feature_id: number) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    await this.ensureItemFeatureExists(normalizedItemCode, feature_id);

    return this.prismaService.itemFeatures.delete({
      where: {
        item_code_feature_id: {
          item_code: normalizedItemCode,
          feature_id,
        },
      },
      include: ITEM_FEATURE_INCLUDE,
    });
  }

  private assertRequiredAction(
    feature: { kind: string },
    enabled: boolean,
    links: { section: { key: string } }[],
  ) {
    if (
      feature.kind !== 'action' ||
      !links.some(({ section }) => supportsRequiredSection(section.key))
    ) {
      throw new BadRequestException(
        'Chỉ action liên kết với section có quy tắc kiểm tra dữ liệu mới được đặt bắt buộc.',
      );
    }
    if (!enabled)
      throw new BadRequestException(
        'Phải bật action trước khi đặt bắt buộc có dữ liệu.',
      );
  }

  private async validateActionIds(
    value: unknown,
    kind: string,
    tx: Prisma.TransactionClient,
    sectionId?: number,
  ) {
    if (value === undefined) return undefined;
    if (
      !Array.isArray(value) ||
      value.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      throw new BadRequestException(
        'action_ids must be an array of positive integer IDs.',
      );
    }
    const ids = value as number[];
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Duplicate action IDs are not allowed.');
    if (kind !== 'section' && ids.length > 0)
      throw new BadRequestException('Only sections can have source actions.');
    if (ids.length) {
      const actions = await tx.features.findMany({
        where: { id: { in: ids }, kind: 'action' },
      });
      if (actions.length !== ids.length)
        throw new BadRequestException(
          'Source actions must exist and have kind action.',
        );
      const existingLink = await tx.featureSectionActions.findFirst({
        where: {
          action_id: { in: ids },
          ...(sectionId === undefined
            ? {}
            : { section_id: { not: sectionId } }),
        },
        include: {
          action: { select: { key: true } },
          section: { select: { label: true } },
        },
      });
      if (existingLink) {
        throw new ConflictException(
          `Action "${existingLink.action.key}" đã thuộc section "${existingLink.section.label}". Hãy gỡ liên kết cũ trước khi chuyển section.`,
        );
      }
    }
    return ids;
  }

  private handleFeatureWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const rawTarget = error.meta?.target;
        const target =
          typeof rawTarget === 'string'
            ? rawTarget
            : Array.isArray(rawTarget)
              ? rawTarget
                  .filter((part): part is string => typeof part === 'string')
                  .join(',')
              : '';
        throw new ConflictException(
          target.includes('action_id')
            ? 'Action đã được liên kết với một section khác. Vui lòng tải lại danh mục tính năng.'
            : 'Feature key already exists',
        );
      }
      if (error.code === 'P2034') {
        throw new ConflictException(
          'Cấu hình vừa được thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.',
        );
      }
    }
    throw error;
  }

  private buildCreateFeatureData(
    dto: CreateFeatureDto,
  ): Prisma.FeaturesUncheckedCreateInput {
    return {
      key: this.normalizeRequiredString(dto.key, 'key'),
      kind: this.normalizeRequiredString(dto.kind, 'kind'),
      label: this.normalizeRequiredString(dto.label, 'label'),
      group_name: this.normalizeOptionalString(dto.group_name, 'group_name'),
      default_order:
        this.normalizeOptionalInt(dto.default_order, 'default_order') ?? 0,
    };
  }

  private async buildUpdateFeatureData(
    id: number,
    dto: UpdateFeatureDto,
    client: Prisma.TransactionClient = this.prismaService,
  ): Promise<Prisma.FeaturesUncheckedUpdateInput> {
    const data: Prisma.FeaturesUncheckedUpdateInput = {};

    if (dto.key !== undefined) {
      const key = this.normalizeRequiredString(dto.key, 'key');
      const existing = await client.features.findUnique({
        where: { key },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Feature key already exists');
      }

      data.key = key;
    }

    if (dto.kind !== undefined) {
      data.kind = this.normalizeRequiredString(dto.kind, 'kind');
    }

    if (dto.label !== undefined) {
      data.label = this.normalizeRequiredString(dto.label, 'label');
    }

    if (dto.group_name !== undefined) {
      data.group_name = this.normalizeOptionalString(
        dto.group_name,
        'group_name',
      );
    }

    if (dto.default_order !== undefined) {
      data.default_order =
        this.normalizeOptionalInt(dto.default_order, 'default_order') ?? 0;
    }

    if (Object.keys(data).length === 0 && dto.action_ids === undefined) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private buildItemFeatureCreateData(
    dto: CreateItemFeatureDto,
  ): Pick<
    Prisma.ItemFeaturesUncheckedCreateInput,
    'enabled' | 'required' | 'order'
  > {
    return {
      enabled:
        dto.enabled === undefined
          ? true
          : this.normalizeRequiredBoolean(dto.enabled, 'enabled'),
      order:
        dto.order === undefined
          ? null
          : this.normalizeOptionalInt(dto.order, 'order'),
      required:
        dto.required === undefined
          ? false
          : this.normalizeRequiredBoolean(dto.required, 'required'),
    };
  }

  private buildItemFeatureUpdateData(
    dto: UpdateItemFeatureDto,
    allowEmpty: boolean,
  ): Prisma.ItemFeaturesUncheckedUpdateInput {
    const data: Prisma.ItemFeaturesUncheckedUpdateInput = {};

    if (dto.enabled !== undefined) {
      data.enabled = this.normalizeRequiredBoolean(dto.enabled, 'enabled');
    }

    if (dto.required !== undefined) {
      data.required = this.normalizeRequiredBoolean(dto.required, 'required');
    }

    if (data.enabled === false) {
      if (data.required === true) {
        throw new BadRequestException(
          'Phải bật action trước khi đặt bắt buộc có dữ liệu.',
        );
      }
      data.required = false;
    }

    if (dto.order !== undefined) {
      data.order = this.normalizeOptionalInt(dto.order, 'order');
    }

    if (!allowEmpty && Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async findFeatureFromDto(dto: CreateItemFeatureDto) {
    const rawFeatureId = dto.feature_id ?? dto.featureId;
    const rawFeatureKey = dto.feature_key ?? dto.featureKey;

    if (rawFeatureId !== undefined && rawFeatureId !== null) {
      const featureId = this.normalizeRequiredInt(rawFeatureId, 'feature_id');
      const feature = await this.prismaService.features.findUnique({
        where: { id: featureId },
        include: FEATURE_LINK_INCLUDE,
      });

      if (!feature) {
        throw new NotFoundException('Feature not found');
      }

      return feature;
    }

    if (rawFeatureKey !== undefined && rawFeatureKey !== null) {
      const featureKey = this.normalizeRequiredString(
        rawFeatureKey,
        'feature_key',
      );
      const feature = await this.prismaService.features.findUnique({
        where: { key: featureKey },
        include: FEATURE_LINK_INCLUDE,
      });

      if (!feature) {
        throw new NotFoundException('Feature not found');
      }

      return feature;
    }

    throw new BadRequestException('feature_id or feature_key is required');
  }

  private async ensureItemExists(
    item_code: string,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const item = await client.items.findFirst({
      where: {
        item_code,
        deleted_at: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }

  private async ensureItemFeatureExists(item_code: string, feature_id: number) {
    await this.ensureItemExists(item_code);
    const feature = await this.prismaService.features.findUnique({
      where: { id: feature_id },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    const itemFeature = await this.prismaService.itemFeatures.findUnique({
      where: {
        item_code_feature_id: {
          item_code,
          feature_id,
        },
      },
    });

    if (!itemFeature) {
      throw new NotFoundException('Item feature not found');
    }
    return itemFeature;
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalString(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    return value.trim() || null;
  }

  private normalizeRequiredInt(value: unknown, fieldName: string) {
    const normalizedValue =
      typeof value === 'number' ? String(value) : String(value).trim();

    if (!/^\d+$/.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    const intValue = Number(normalizedValue);

    if (!Number.isSafeInteger(intValue) || intValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return intValue;
  }

  private normalizeOptionalInt(value: unknown, fieldName: string) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    const normalizedValue =
      typeof value === 'number' ? String(value) : String(value).trim();

    if (!/^-?\d+$/.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    const intValue = Number(normalizedValue);

    if (!Number.isSafeInteger(intValue)) {
      throw new BadRequestException(`${fieldName} must be a safe integer`);
    }

    return intValue;
  }

  private normalizeRequiredBoolean(value: unknown, fieldName: string) {
    const normalizedValue =
      typeof value === 'string' ? value.trim().toLowerCase() : value;

    if (
      normalizedValue === true ||
      normalizedValue === 1 ||
      normalizedValue === 'true' ||
      normalizedValue === '1'
    ) {
      return true;
    }

    if (
      normalizedValue === false ||
      normalizedValue === 0 ||
      normalizedValue === 'false' ||
      normalizedValue === '0'
    ) {
      return false;
    }

    throw new BadRequestException(`${fieldName} must be a boolean`);
  }

  private normalizeOptionalBoolean(value: unknown, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.normalizeRequiredBoolean(value, fieldName);
  }
}
