import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { SAP_BP_SELECT, SapBusinessPartner } from './sap-business-partner';
import { SapItemSeries } from './sap-item-series';
import {
  SAP_PRODUCTION_ORDER_BASE_TYPE,
  SAP_PRODUCTION_RECEIPT,
  SAP_PRODUCTION_RECEIPT_LINES,
  SapProductionOrderLookup,
  SapProductionOrderReference,
  SapProductionReceipt,
  SapProductionReceiptRow,
} from './sap-production-receipt';

type SapPagedResponse<T> = {
  value?: T[];
  '@odata.nextLink'?: string;
  'odata.nextLink'?: string;
};

type SapSessionCache = {
  token: string | null;
  expiresAt: number | null;
};

@Injectable()
export class SapB1ServiceLayerClient {
  private readonly logger = new Logger(SapB1ServiceLayerClient.name);
  private readonly sapApi: AxiosInstance;
  private readonly sessionTimeoutMs: number;
  private readonly sessionCache: SapSessionCache = {
    token: null,
    expiresAt: null,
  };
  private loginPromise: Promise<string> | null = null;

  constructor() {
    this.sapApi = axios.create({
      baseURL: process.env.SAP_SERVICE_LAYER_URL,
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.SAP_REJECT_UNAUTHORIZED === 'true',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: Number(process.env.SAP_REQUEST_TIMEOUT_MS ?? 30000),
    });

    const timeoutMinutes = Number(
      process.env.SAP_SESSION_TIMEOUT_MINUTES ??
        process.env.SESSIONTIMEOUT ??
        25,
    );
    this.sessionTimeoutMs = Math.max(timeoutMinutes - 1, 1) * 60 * 1000;
  }

  async getItems() {
    return this.fetchAllPages(
      'Items?$select=ItemCode,ItemName,InventoryUOM,U_MDK,ManageBatchNumbers,Series',
    );
  }

  async getBusinessPartners(cardType?: 'cSupplier') {
    const filter = cardType ? `&$filter=CardType eq '${cardType}'` : '';
    return this.fetchAllPages<SapBusinessPartner>(
      `BusinessPartners?$select=${SAP_BP_SELECT}&$orderby=CardCode${filter}`,
    );
  }

  async getItemSeries(): Promise<SapItemSeries[]> {
    const data = await this.post<SapPagedResponse<SapItemSeries>>(
      'SeriesService_GetDocumentSeries',
      { DocumentTypeParams: { Document: '4' } },
    );
    if (!Array.isArray(data.value)) {
      throw new Error('SAP item series response did not include a value array');
    }
    return data.value;
  }

  async getProductionOrders() {
    return this.fetchAllPages(
      'ProductionOrders?$select=DocumentNumber,ItemNo,ProductionOrderStatus,ProductionOrderType,PlannedQuantity,PostingDate,DueDate,ProductionOrderOrigin,Warehouse,InventoryUOM,JournalRemarks,CreationDate,StartDate,ProductDescription,U_YCDL,U_HSD,U_NSX,U_SL,U_MDK,U_QCHH,U_MCT,U_GC,U_LSXTP,U_MLSX,U_LLSX,U_NPC,U_NHT,U_CL,Remarks&$skip=2800',
    );
  }

  async getProductionOrderById<T = any>(id: number | string): Promise<T> {
    return this.get<T>(`ProductionOrders(${id})`);
  }

  async getProductionReceipts(
    order: SapProductionOrderReference,
  ): Promise<SapProductionReceipt[] | null> {
    if (!Number.isSafeInteger(order.id) || order.id <= 0) return null;

    // The local ID is SAP DocumentNumber. Receipt lines reference AbsoluteEntry.
    const sapOrders = await this.fetchAllPages<SapProductionOrderLookup>(
      `ProductionOrders?$select=AbsoluteEntry,DocumentNumber,ItemNo,U_SL,U_MLSX&$filter=DocumentNumber eq ${order.id}`,
    );
    let matches = sapOrders.filter(
      (candidate) =>
        candidate.DocumentNumber === order.id &&
        candidate.ItemNo === order.item_code &&
        candidate.U_SL?.trim() === order.lot_no.trim(),
    );
    if (matches.length > 1 && order.production_order_code) {
      matches = matches.filter(
        (candidate) => candidate.U_MLSX === order.production_order_code,
      );
    }
    if (matches.length === 0) return null;
    const orderEntry = matches[0].AbsoluteEntry;
    if (
      matches.length > 1 ||
      !Number.isSafeInteger(orderEntry) ||
      orderEntry <= 0
    ) {
      throw new Error('SAP production order could not be uniquely resolved');
    }

    const header = SAP_PRODUCTION_RECEIPT;
    const lines = SAP_PRODUCTION_RECEIPT_LINES;
    const filters = [
      `${header}/DocEntry eq ${lines}/DocEntry`,
      `${lines}/BaseType eq ${SAP_PRODUCTION_ORDER_BASE_TYPE}`,
      `${lines}/BaseEntry eq ${orderEntry}`,
    ];
    const rows = await this.fetchAllPages<SapProductionReceiptRow>(
      `$crossjoin(${header},${lines})?` +
        `$expand=${header}($select=DocEntry,DocNum,DocDate,Comments,JournalMemo,Reference2),` +
        `${lines}($select=LineNum,BaseType,BaseEntry,ItemCode,ItemDescription,Quantity,Price,WarehouseCode,MeasureUnit,Currency,U_SL,U_HSD,U_NSX)` +
        `&$filter=${encodeURIComponent(filters.join(' and '))}` +
        `&$orderby=${encodeURIComponent(`${header}/DocEntry desc,${lines}/LineNum asc`)}`,
    );
    const receipts = new Map<number, SapProductionReceipt>();
    for (const row of rows) {
      const document = row[header];
      const line = row[lines];
      if (
        line.BaseEntry !== orderEntry ||
        line.BaseType !== SAP_PRODUCTION_ORDER_BASE_TYPE
      )
        continue;
      const receipt = receipts.get(document.DocEntry);
      if (receipt) {
        receipt.DocumentLines.push(line);
      } else {
        receipts.set(document.DocEntry, { ...document, DocumentLines: [line] });
      }
    }
    return [...receipts.values()];
  }

  async patchProductionOrderById(
    id: number | string,
    body: Record<string, unknown>,
  ) {
    await this.patch(`ProductionOrders(${id})`, body);

    return {
      message: 'Production order updated successfully',
    };
  }

  async getUnitOfMeasurements<T = any>() {
    return this.fetchAllPages<T>(
      'UnitOfMeasurements?$select=Code,Name,AbsEntry',
    );
  }

  private async fetchAllPages<T = any>(endpoint: string): Promise<T[]> {
    const results: T[] = [];
    let nextEndpoint: string | null = endpoint;

    while (nextEndpoint) {
      const data = await this.get<SapPagedResponse<T>>(nextEndpoint);
      results.push(...(data.value ?? []));
      const nextLink = data['@odata.nextLink'] ?? data['odata.nextLink'];
      if (!nextLink) break;

      const currentUrl = new URL(this.sapApi.getUri({ url: nextEndpoint }));
      const nextUrl = new URL(nextLink, currentUrl);
      if (nextUrl.origin !== currentUrl.origin) {
        throw new Error('SAP pagination returned a link to a different origin');
      }
      nextEndpoint = nextUrl.href;
    }

    return results;
  }

  private async get<T>(
    endpoint: string,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const token = await this.getValidToken();

    try {
      const response = await this.sapApi.get<T>(endpoint, {
        headers: this.buildSessionHeaders(token),
      });

      if (!response.data) {
        throw new Error('No data found');
      }

      return response.data;
    } catch (error) {
      if (
        retryOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        this.clearSession();
        return this.get<T>(endpoint, false);
      }

      throw error;
    }
  }

  private async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const token = await this.getValidToken();
    try {
      const response = await this.sapApi.post<T>(endpoint, body, {
        headers: this.buildSessionHeaders(token),
      });
      return response.data;
    } catch (error) {
      if (
        retryOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        this.clearSession();
        return this.post<T>(endpoint, body, false);
      }
      throw error;
    }
  }

  private async patch(
    endpoint: string,
    body: Record<string, unknown>,
    retryOnUnauthorized = true,
  ): Promise<void> {
    const token = await this.getValidToken();

    try {
      await this.sapApi.patch(endpoint, body, {
        headers: this.buildSessionHeaders(token),
      });
    } catch (error) {
      if (
        retryOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        this.clearSession();
        return this.patch(endpoint, body, false);
      }

      throw error;
    }
  }

  private async getValidToken(): Promise<string> {
    const now = Date.now();

    if (
      this.sessionCache.token &&
      this.sessionCache.expiresAt &&
      now < this.sessionCache.expiresAt
    ) {
      return this.sessionCache.token;
    }

    if (!this.loginPromise) {
      this.loginPromise = this.refreshToken();
    }

    try {
      return await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  private async refreshToken(): Promise<string> {
    if (this.sessionCache.token) {
      try {
        await this.logout(this.sessionCache.token);
      } catch (error) {
        this.logger.warn(
          `Error logging out expired SAP session: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const token = await this.login();
    this.sessionCache.token = token;
    this.sessionCache.expiresAt = Date.now() + this.sessionTimeoutMs;

    return token;
  }

  private async login(): Promise<string> {
    if (!process.env.SAP_SERVICE_LAYER_URL) {
      throw new Error('SAP_SERVICE_LAYER_URL is not configured');
    }

    const response = await this.sapApi.post<{ SessionId?: string }>('Login', {
      CompanyDB: process.env.SAP_COMPANY_DB,
      Password: process.env.SAP_PASSWORD,
      UserName: process.env.SAP_USERNAME,
    });

    if (!response.data.SessionId) {
      throw new Error('SAP login response did not include SessionId');
    }

    return response.data.SessionId;
  }

  private async logout(token: string) {
    await this.sapApi.post(
      'Logout',
      {},
      {
        headers: this.buildSessionHeaders(token),
      },
    );
  }

  private buildSessionHeaders(token: string) {
    return {
      Cookie: `B1SESSION=${token}`,
      'B1S-PageSize': Number(process.env.SAP_B1_PAGE_SIZE ?? 10000),
    };
  }

  private clearSession() {
    this.sessionCache.token = null;
    this.sessionCache.expiresAt = null;
  }
}
