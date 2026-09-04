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

const ITEM_FEATURE_INCLUDE = {
  feature: true,
  item: true,
} satisfies Prisma.ItemFeaturesInclude;

@Injectable()
export class FeaturesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.features.findMany({
      orderBy: [{ default_order: 'asc' }, { key: 'asc' }],
    });
  }

  async findById(id: number) {
    const feature = await this.prismaService.features.findUnique({
      where: { id },
      include: {
        itemFeatures: true,
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  async findByKey(key: string) {
    const normalizedKey = this.normalizeRequiredString(key, 'key');
    const feature = await this.prismaService.features.findUnique({
      where: { key: normalizedKey },
      include: {
        itemFeatures: true,
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  async create(createDto: CreateFeatureDto) {
    const data = this.buildCreateFeatureData(createDto);

    const existing = await this.prismaService.features.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new ConflictException('Feature key already exists');
    }

    return this.prismaService.features.create({
      data,
    });
  }

  async update(id: number, updateDto: UpdateFeatureDto) {
    await this.findById(id);
    const data = await this.buildUpdateFeatureData(id, updateDto);

    return this.prismaService.features.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.features.delete({
      where: { id },
    });
  }

  async findByItemCode(item_code: string, includeDisabled?: string) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    await this.ensureItemExists(normalizedItemCode);

    const shouldIncludeDisabled =
      this.normalizeOptionalBoolean(includeDisabled, 'includeDisabled') ??
      false;

    return this.prismaService.itemFeatures.findMany({
      where: {
        item_code: normalizedItemCode,
        ...(shouldIncludeDisabled ? {} : { enabled: true }),
      },
      include: ITEM_FEATURE_INCLUDE,
      orderBy: [{ order: 'asc' }, { feature: { default_order: 'asc' } }],
    });
  }

  async findConfigByItemCode(item_code: string, includeDisabled?: string) {
    const itemFeatures = await this.findByItemCode(item_code, includeDisabled);
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    const features = itemFeatures.map((itemFeature) => ({
      feature_id: itemFeature.feature_id,
      key: itemFeature.feature.key,
      kind: itemFeature.feature.kind,
      label: itemFeature.feature.label,
      group_name: itemFeature.feature.group_name,
      order: itemFeature.order ?? itemFeature.feature.default_order,
      enabled: itemFeature.enabled,
    }));

    return this.buildItemFeatureConfig(normalizedItemCode, features);
  }

  async upsertItemFeature(item_code: string, createDto: CreateItemFeatureDto) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    await this.ensureItemExists(normalizedItemCode);
    const feature = await this.findFeatureFromDto(createDto);
    const updateData = this.buildItemFeatureUpdateData(createDto, true);
    const createData = this.buildItemFeatureCreateData(createDto);

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
      sourceItemCode.toLocaleLowerCase() ===
      targetItemCode.toLocaleLowerCase()
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
      const copiedFeatures = features.map((feature) => {
        const sourceFeature = sourceFeatureById.get(feature.id);

        return {
          feature_id: feature.id,
          key: feature.key,
          kind: feature.kind,
          label: feature.label,
          group_name: feature.group_name,
          order: sourceFeature?.order ?? feature.default_order,
          enabled: sourceFeature?.enabled ?? false,
        };
      });

      await tx.itemFeatures.deleteMany({
        where: { item_code: targetItemCode },
      });

      if (copiedFeatures.length > 0) {
        await tx.itemFeatures.createMany({
          data: copiedFeatures.map(({ feature_id, enabled, order }) => ({
            item_code: targetItemCode,
            feature_id,
            enabled,
            order,
          })),
        });
      }

      return this.buildItemFeatureConfig(targetItemCode, copiedFeatures);
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
    await this.ensureItemFeatureExists(normalizedItemCode, feature_id);
    const data = this.buildItemFeatureUpdateData(updateDto, false);

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

  private buildItemFeatureConfig<
    T extends {
      kind: string;
      enabled: boolean;
    },
  >(item_code: string, features: T[]) {
    return {
      item_code,
      actions: features.filter((feature) => feature.kind === 'action'),
      sections: features.filter((feature) => feature.kind === 'section'),
      features,
    };
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
  ): Promise<Prisma.FeaturesUncheckedUpdateInput> {
    const data: Prisma.FeaturesUncheckedUpdateInput = {};

    if (dto.key !== undefined) {
      const key = this.normalizeRequiredString(dto.key, 'key');
      const existing = await this.prismaService.features.findUnique({
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

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private buildItemFeatureCreateData(
    dto: CreateItemFeatureDto,
  ): Pick<Prisma.ItemFeaturesUncheckedCreateInput, 'enabled' | 'order'> {
    return {
      enabled:
        dto.enabled === undefined
          ? true
          : this.normalizeRequiredBoolean(dto.enabled, 'enabled'),
      order:
        dto.order === undefined
          ? null
          : this.normalizeOptionalInt(dto.order, 'order'),
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
      });

      if (!feature) {
        throw new NotFoundException('Feature not found');
      }

      return feature;
    }

    throw new BadRequestException('feature_id or feature_key is required');
  }

  private async ensureItemExists(item_code: string) {
    const item = await this.prismaService.items.findFirst({
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
