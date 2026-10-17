import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from '../features/features.service';
import { readFeatureConfigSnapshot } from '../features/item-feature-config';
import {
  getSectionPresenceRule,
  normalizeSectionKey,
  SECTION_COUNT_RELATIONS,
  SECTION_SINGLETON_RELATIONS,
  supportsRequiredSection,
} from './production-order-section-rules';

export type SectionCompleteness = {
  key: string;
  label: string;
  order: number;
  status: 'has_data' | 'missing' | 'unavailable';
  record_count: number | null;
  rule: string;
};

@Injectable()
export class ProductionOrderLocalCompletenessService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

  async findByProductionOrder(id: number) {
    const order = await this.prismaService.productionOrders.findUnique({
      where: { id },
      select: {
        item_code: true,
        documentControl: { select: { feature_config_snapshot: true } },
      },
    });
    if (!order) throw new NotFoundException('Production order not found');

    const snapshot = readFeatureConfigSnapshot(
      order.documentControl?.feature_config_snapshot,
      order.item_code,
    );
    const config =
      snapshot ??
      (await this.featuresService.findConfigByItemCode(order.item_code));
    const required = Array.from(
      new Map(
        config.sections
          .filter((section) => section.enabled && section.required)
          .map((section) => [
            normalizeSectionKey(section.key),
            { ...section, key: normalizeSectionKey(section.key) },
          ]),
      ).values(),
    ).sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

    // Count only required relations in one query. Do not load every section's
    // records, images, or signatures just to show the checklist.
    const countSelect: Partial<
      Record<keyof Prisma.ProductionOrdersCountOutputType, true>
    > = {};
    const select: Prisma.ProductionOrdersSelect = { id: true };
    for (const section of required) {
      const relation =
        SECTION_COUNT_RELATIONS[
          section.key as keyof typeof SECTION_COUNT_RELATIONS
        ];
      const singleton =
        SECTION_SINGLETON_RELATIONS[
          section.key as keyof typeof SECTION_SINGLETON_RELATIONS
        ];
      if (relation) countSelect[relation] = true;
      if (singleton) select[singleton] = { select: { id: true } };
    }
    if (Object.keys(countSelect).length)
      select._count = {
        select: {
          ...countSelect,
          ...(countSelect.deviations
            ? { deviations: { where: { deleted_at: null } } }
            : {}),
        },
      };
    const hasLocalCounts = Object.keys(select).length > 1;
    const counts = hasLocalCounts
      ? await this.prismaService.productionOrders.findUnique({
          where: { id },
          select,
        })
      : null;
    const relationCounts = counts?._count as Record<string, number> | undefined;

    const sections: SectionCompleteness[] = await Promise.all(
      required.map(async (section) => {
        const relation =
          SECTION_COUNT_RELATIONS[
            section.key as keyof typeof SECTION_COUNT_RELATIONS
          ];
        const singleton =
          SECTION_SINGLETON_RELATIONS[
            section.key as keyof typeof SECTION_SINGLETON_RELATIONS
          ];
        let recordCount: number | null = null;
        if (relation) recordCount = relationCounts?.[relation] ?? 0;
        else if (singleton) recordCount = counts?.[singleton] ? 1 : 0;
        else if (section.key === 'mixing_records')
          recordCount = await this.countEnteredMixingRecords(id);
        else if (section.key === 'production_order_attachments') {
          recordCount =
            await this.prismaService.productionOrderAttachments.count({
              where: { production_order_id: id, files: { some: {} } },
            });
        } else {
          recordCount = await this.countExternalSection(section.key, id);
        }

        return {
          key: section.key,
          label: section.label,
          order: section.order,
          status:
            recordCount === null
              ? 'unavailable'
              : recordCount > 0
                ? 'has_data'
                : 'missing',
          record_count: recordCount,
          rule: supportsRequiredSection(section.key)
            ? getSectionPresenceRule(section.key)
            : 'Chưa có quy tắc kiểm tra section này.',
        };
      }),
    );

    return {
      production_order_id: id,
      configuration_source: snapshot ? 'snapshot' : 'item',
      rule_version: 1,
      required_count: sections.length,
      completed_count: sections.filter(
        (section) => section.status === 'has_data',
      ).length,
      is_complete: sections.every((section) => section.status === 'has_data'),
      required_sections: sections,
      missing_sections: sections.filter(
        (section) => section.status === 'missing',
      ),
      unavailable_sections: sections.filter(
        (section) => section.status === 'unavailable',
      ),
    };
  }

  // Local consumers keep unsupported requirements unavailable without external calls.
  protected countExternalSection(
    _key: string,
    _id: number,
  ): Promise<number | null> {
    return Promise.resolve(null);
  }

  private async countEnteredMixingRecords(id: number) {
    const records =
      await this.prismaService.productionOrderMixingRecords.findMany({
        where: { production_order_id: id },
        select: {
          stages: {
            select: {
              steps: {
                select: {
                  parameters: {
                    select: {
                      data_type: true,
                      result_value: true,
                      result_image_path: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    return records.filter((record) =>
      record.stages.some((stage) =>
        stage.steps.some((step) =>
          step.parameters.some(
            (parameter) =>
              Boolean(parameter.result_image_path?.trim()) ||
              Boolean(parameter.result_value?.trim()),
          ),
        ),
      ),
    ).length;
  }
}
