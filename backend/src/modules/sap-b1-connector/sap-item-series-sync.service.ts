import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';
import { SapItemSeries } from './sap-item-series';

const SYNC_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class SapItemSeriesSyncService implements OnModuleInit {
  private readonly logger = new Logger(SapItemSeriesSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sap: SapB1ServiceLayerClient,
  ) {}

  async onModuleInit() {
    await this.syncIfDue();
  }

  @Interval(60 * 1000)
  async syncIfDue() {
    if (this.running) return;
    this.running = true;
    try {
      const lastSync = await this.prisma.sapItemSeries.aggregate({
        _max: { synced_at: true },
      });
      if (
        lastSync._max.synced_at &&
        Date.now() - lastSync._max.synced_at.getTime() < SYNC_INTERVAL_MS
      ) {
        return;
      }

      const rows = await this.sap.getItemSeries();
      if (!rows.length) {
        throw new Error('SAP returned an empty item series list');
      }
      const syncedAt = new Date();
      const data = rows.map((row) => this.mapSeries(row, syncedAt));
      await this.prisma.$transaction(
        data.map((series) =>
          this.prisma.sapItemSeries.upsert({
            where: { series: series.series },
            create: series,
            update: series,
          }),
        ),
      );
      this.logger.log(`Synced ${data.length} SAP item series`);
    } catch (error) {
      this.logger.error(
        `Failed to sync SAP item series: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private mapSeries(row: SapItemSeries, syncedAt: Date) {
    if (
      !Number.isInteger(row.Series) ||
      row.Document !== '4' ||
      typeof row.Name !== 'string' ||
      !row.Name.trim()
    ) {
      throw new Error('Invalid SAP item series record');
    }
    return {
      series: row.Series,
      document: row.Document,
      document_sub_type: row.DocumentSubType ?? null,
      initial_number: row.InitialNumber ?? null,
      last_number: row.LastNumber ?? null,
      next_number: row.NextNumber ?? null,
      name: row.Name,
      prefix: row.Prefix ?? null,
      suffix: row.Suffix ?? null,
      remarks: row.Remarks ?? null,
      group_code: row.GroupCode ?? null,
      period_indicator: row.PeriodIndicator ?? null,
      is_digital_series: this.parseBoolean(row.IsDigitalSeries),
      digit_number: row.DigitNumber ?? null,
      series_type: row.SeriesType ?? null,
      bpl_id: row.BPLID ?? null,
      at_document_type: row.ATDocumentType ?? null,
      is_electronic_comm_enabled: this.parseBoolean(
        row.IsElectronicCommEnabled,
      ),
      cost_account_only: this.parseBoolean(row.CostAccountOnly),
      invoice_type: row.InvoiceType ?? null,
      invoice_type_of_negative_invoice:
        row.InvoiceTypeOfNegativeInvoice ?? null,
      is_manual: this.parseBoolean(row.IsManual),
      is_locked: this.parseBoolean(row.Locked),
      synced_at: syncedAt,
    };
  }

  private parseBoolean(value: string | null | undefined) {
    if (value == null) return null;
    if (value === 'tYES') return true;
    if (value === 'tNO') return false;
    throw new Error(`Invalid SAP boolean: ${value}`);
  }
}
