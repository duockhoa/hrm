import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
@Injectable()
export class SapB1ConnectorService {
  constructor(private readonly prismaService: PrismaService) {}
  private readonly logger = new Logger(SapB1ConnectorService.name);

  @Cron('0 */15 * * * *')
  async handleCron() {
    try {
      const response = await axios.get('https://sap-b1-connector.dkpharma.io.vn/items');
      
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
              if (existingItem.item_name !== item_name || existingItem.unit !== unit || existingItem.dk_code !== dk_code) {
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
            
          }
        }
      }
    } catch (error) {
      console.log('Failed to fetch/sync items', error instanceof Error ? error.message : error);
    }
  }
}
