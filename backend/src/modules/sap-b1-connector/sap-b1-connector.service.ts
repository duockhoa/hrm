import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
@Injectable()
export class SapB1ConnectorService {
  constructor(private readonly prismaService: PrismaService) {}
  private readonly logger = new Logger(SapB1ConnectorService.name);

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

  @Cron('0 */15 * * * *')
  async handleCronSyncItems() {
    try {
      const response = await axios.get(
        'https://sap-b1-connector.dkpharma.io.vn/items',
      );

      const items = response.data;
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            const item_code = item.ItemCode;
            const item_name = item.ItemName;
            const unit = item.SalesUnit;
            const dk_code = item.U_MDK;

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
          } catch (itemError) {}
        }
      }
    } catch (error) {
      console.log(
        'Failed to fetch/sync items',
        error instanceof Error ? error.message : error,
      );
    }
  }

  @Cron('30 */15 * * * *')
  async handleCronSyncProductionOrders() {
    try {
      const response = await axios.get(
        'https://sap-b1-connector.dkpharma.io.vn/production-orders',
      );
      const production_orders = response.data;

      if (Array.isArray(production_orders)) {
        for (const production_order of production_orders) {
          try {
            const id = Number(production_order.DocumentNumber);
            const item_code = this.requireSapString(
              production_order.ItemNo,
              'ItemNo',
            );
            const planned_quatity = Number(production_order.PlannedQuantity);

            if (!Number.isInteger(id) || !Number.isInteger(planned_quatity)) {
              this.logger.warn(
                `Skipped production order with invalid number fields: ${production_order.DocumentNumber}`,
              );
              continue;
            }

            const existingItem = await this.prismaService.items.findUnique({
              where: { item_code },
            });

            if (!existingItem) {
              this.logger.warn(
                `Skipped production order ${id}: item ${item_code} does not exist`,
              );
              continue;
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
            };

            await this.prismaService.productionOrders.upsert({
              where: { id },
              update: productionOrderData,
              create: {
                id,
                ...productionOrderData,
              },
            });
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
}
