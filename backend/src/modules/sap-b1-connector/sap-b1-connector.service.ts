import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';
import { Prisma } from '@prisma/client';
import {
  SAP_BP_DATE_FIELDS,
  SAP_BP_STRING_FIELDS,
  SAP_BP_TYPES,
  SapBusinessPartner,
} from './sap-business-partner';

const SAP_ITEM_CODE_MAX_LENGTH = 191;

type SyncProductionOrderOptions = {
  throwOnSkip?: boolean;
};

@Injectable()
export class SapB1ConnectorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sapB1Client: SapB1ServiceLayerClient,
  ) {}
  private readonly logger = new Logger(SapB1ConnectorService.name);
  private businessPartnersSyncRunning = false;

  @Cron('0 */30 * * * *')
  async handleCronSyncBusinessPartners() {
    if (this.businessPartnersSyncRunning) return;
    this.businessPartnersSyncRunning = true;
    try {
      const partners = await this.sapB1Client.getBusinessPartners();
      for (const partner of partners) {
        try {
          const data = this.mapBusinessPartner(partner);
          await this.prismaService.businessPartners.upsert({
            where: { card_code: data.card_code },
            create: data,
            update: data,
          });
        } catch (error) {
          this.logger.warn(
            `Failed to sync business partner ${partner.CardCode ?? '(missing code)'}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
      this.logger.log(
        `Business partner sync finished: ${partners.length} records fetched`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch/sync business partners: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.businessPartnersSyncRunning = false;
    }
  }

  private mapBusinessPartner(
    partner: SapBusinessPartner,
  ): Prisma.BusinessPartnersCreateInput {
    const card_code = this.requireSapString(partner.CardCode, 'CardCode');
    const card_name = this.requireSapString(partner.CardName, 'CardName');
    const card_type = this.requireSapString(partner.CardType, 'CardType');
    if (card_code.length > 191)
      throw new Error('CardCode exceeds 191 characters');
    if (!SAP_BP_TYPES.some((type) => type === card_type))
      throw new Error(`Invalid CardType: ${card_type}`);
    if (partner.GroupCode != null && !Number.isInteger(partner.GroupCode))
      throw new Error('Invalid GroupCode');

    const strings = Object.fromEntries(
      Object.entries(SAP_BP_STRING_FIELDS).map(([column, field]) => [
        column,
        partner[field] || null,
      ]),
    );
    const dates = Object.fromEntries(
      Object.entries(SAP_BP_DATE_FIELDS).map(([column, field]) => [
        column,
        partner[field] ? this.parseSapDate(partner[field]) : null,
      ]),
    );
    return {
      ...strings,
      ...dates,
      card_code,
      card_name,
      card_type,
      group_code: partner.GroupCode ?? null,
      is_valid: this.parseSapBoolean(partner.Valid),
      is_frozen: this.parseSapBoolean(partner.Frozen),
    };
  }

  private parseSapBoolean(value: string | null | undefined): boolean | null {
    if (!value) return null;
    if (value === 'tYES') return true;
    if (value === 'tNO') return false;
    throw new Error(`Invalid SAP boolean: ${value}`);
  }

  private parseSapDate(value: string | null | undefined): Date {
    if (!value) {
      throw new Error('Missing required SAP date value');
    }

    const date = new Date(
      value.includes('T') ? value : `${value}T00:00:00.000Z`,
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid SAP date value: ${value}`);
    }

    return date;
  }

  private requireSapString(
    value: string | number | null | undefined,
    fieldName: string,
  ): string {
    if (value === null || value === undefined || value === '') {
      throw new Error(`Missing required SAP field: ${fieldName}`);
    }

    return String(value);
  }

  private isMissingSapValue(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  async patchProductionOrderById(id: number, body: Record<string, unknown>) {
    await this.sapB1Client.patchProductionOrderById(id, body);

    const productionOrder = await this.sapB1Client.getProductionOrderById(id);
    const syncedProductionOrder = await this.syncProductionOrder(
      productionOrder,
      {
        throwOnSkip: true,
      },
    );

    return {
      message: 'Production order updated successfully',
      productionOrder: syncedProductionOrder,
    };
  }

  @Cron('0 */15 * * * *')
  async handleCronSyncItems() {
    try {
      const items = await this.sapB1Client.getItems();
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            const sapItemCode = item.ItemCode;
            const sapItemName = item.ItemName;
            const unit = item.SalesUnit;
            const dk_code = item.U_MDK;

            if (this.isMissingSapValue(sapItemCode)) {
              this.logger.warn('Skipped item with missing ItemCode');
              continue;
            }

            const item_code = String(sapItemCode);

            if (item_code.length > SAP_ITEM_CODE_MAX_LENGTH) {
              this.logger.warn(
                `Skipped item ${item_code}: ItemCode is longer than ${SAP_ITEM_CODE_MAX_LENGTH} characters`,
              );
              continue;
            }

            if (this.isMissingSapValue(sapItemName)) {
              this.logger.warn(`Skipped item ${item_code}: missing ItemName`);
              continue;
            }

            const item_name = String(sapItemName);

            const existingItem = await this.prismaService.items.findUnique({
              where: { item_code: item_code },
            });

            if (existingItem) {
              if (
                existingItem.item_name !== item_name ||
                existingItem.unit !== unit ||
                existingItem.dk_code !== dk_code
              ) {
                await this.prismaService.items.update({
                  where: { item_code: item_code },
                  data: {
                    item_name: item_name,
                    unit: unit,
                    dk_code: dk_code,
                  },
                });
                this.logger.log(`Updated product: ${item_code}`);
              }
            } else {
              await this.prismaService.items.create({
                data: {
                  item_code: item_code,
                  item_name: item_name,
                  unit: unit,
                  dk_code: dk_code,
                },
              });
              this.logger.log(`Created new product: ${item_code}`);
            }
          } catch (itemError) {
            this.logger.warn(
              `Failed to sync item: ${
                itemError instanceof Error ? itemError.message : itemError
              }`,
            );
          }
        }
      }
    } catch (error) {
      console.log(
        'Failed to fetch/sync items',
        error instanceof Error ? error.message : error,
      );
    }
  }

  @Cron(process.env.SAP_B1_LOT_LIST_SYNC_CRON || '*/30 * * * * *')
  async handleCronSyncProductionOrders() {
    try {
      const production_orders = await this.sapB1Client.getProductionOrders();

      if (Array.isArray(production_orders)) {
        for (const production_order of production_orders) {
          try {
            await this.syncProductionOrder(production_order);
          } catch (productionOrderError) {
            this.logger.warn(
              `Failed to sync production order: ${
                productionOrderError instanceof Error
                  ? productionOrderError.message
                  : productionOrderError
              }`,
            );
          }
        }
      }
    } catch (error) {
      console.log(
        'Failed to fetch/sync production orders',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async syncProductionOrder(
    production_order: any,
    options: SyncProductionOrderOptions = {},
  ) {
    const id = Number(production_order.DocumentNumber);
    const item_code = this.requireSapString(production_order.ItemNo, 'ItemNo');
    const planned_quatity = Number(production_order.PlannedQuantity);

    if (!Number.isInteger(id) || !Number.isInteger(planned_quatity)) {
      const message = `Skipped production order with invalid number fields: ${production_order.DocumentNumber}`;

      if (options.throwOnSkip) {
        throw new Error(message);
      }

      this.logger.warn(message);
      return null;
    }

    const existingItem = await this.prismaService.items.findUnique({
      where: { item_code },
    });

    if (!existingItem) {
      const message = `Skipped production order ${id}: item ${item_code} does not exist`;

      if (options.throwOnSkip) {
        throw new Error(message);
      }

      this.logger.warn(message);
      return null;
    }

    const productionOrderData = {
      item_code,
      status: this.requireSapString(
        production_order.ProductionOrderStatus,
        'ProductionOrderStatus',
      ),
      type: this.requireSapString(
        production_order.ProductionOrderType,
        'ProductionOrderType',
      ),
      planned_quatity,
      creation_date: this.parseSapDate(production_order.CreationDate),
      origin: production_order.ProductionOrderOrigin ?? null,
      warehouse: production_order.Warehouse ?? null,
      unit: this.requireSapString(
        production_order.InventoryUOM,
        'InventoryUOM',
      ),
      start_date: this.parseSapDate(production_order.StartDate),
      description: this.requireSapString(
        production_order.ProductDescription,
        'ProductDescription',
      ),
      date_manufacture: production_order.U_NSX ?? null,
      expire_date: production_order.U_HSD ?? null,
      lot_no: this.requireSapString(production_order.U_SL, 'U_SL'),
      packing_specification: production_order.U_QCHH ?? null,
      production_order_code: production_order.U_MLSX ?? null,
      remarks: production_order.Remarks ?? null,
      internal_notes: production_order.U_GC ?? null,
    };

    return this.prismaService.productionOrders.upsert({
      where: { id },
      update: productionOrderData,
      create: {
        id,
        ...productionOrderData,
      },
    });
  }
}
