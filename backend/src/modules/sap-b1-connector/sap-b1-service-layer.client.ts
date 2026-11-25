import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { readFileSync } from 'node:fs';
import { checkServerIdentity } from 'node:tls';
import { SAP_BP_SELECT, SapBusinessPartner } from './sap-business-partner';
import { SapItemSeries } from './sap-item-series';
import {
  SAP_PRODUCTION_ORDER_BASE_TYPE,
  SAP_PRODUCTION_RECEIPT,
  SAP_PRODUCTION_RECEIPT_LINES,
  SapProductionOrderLookup,
  SapProductionOrderReference,
  SapProductionReceipt,
  SapProductionReceiptPayload,
  SapProductionReceiptResult,
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

export type SapUserSession = { sessionId: string; routeId?: string };

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
  private personalAgent?: https.Agent;

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

  async resolveProductionOrderEntry(
    order: SapProductionOrderReference,
    session?: SapUserSession,
  ) {
    if (!Number.isSafeInteger(order.id) || order.id <= 0) return null;

    // The local ID is SAP DocumentNumber. Receipt lines reference AbsoluteEntry.
    const sapOrders = await this.fetchAllPages<SapProductionOrderLookup>(
      `ProductionOrders?$select=AbsoluteEntry,DocumentNumber,ItemNo,U_SL,U_MLSX&$filter=DocumentNumber eq ${order.id}`,
      session,
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
    return orderEntry;
  }

  async getProductionReceipts(
    order: SapProductionOrderReference,
  ): Promise<SapProductionReceipt[] | null> {
    const orderEntry = await this.resolveProductionOrderEntry(order);
    return orderEntry === null
      ? null
      : this.getProductionReceiptsForEntry(orderEntry);
  }

  async getReceiptItemTracking(itemCode: string, session?: SapUserSession) {
    const key = encodeURIComponent(itemCode.replaceAll("'", "''"));
    return this.get<{
      ManageBatchNumbers: 'tYES' | 'tNO';
      ManageSerialNumbers: 'tYES' | 'tNO';
    }>(
      `Items('${key}')?$select=ManageBatchNumbers,ManageSerialNumbers`,
      session,
    );
  }

  async postProductionReceipt(
    payload: SapProductionReceiptPayload,
    session: SapUserSession,
  ) {
    const result = await this.post<SapProductionReceiptResult>(
      SAP_PRODUCTION_RECEIPT,
      payload,
      session,
    );
    if (
      !Number.isSafeInteger(result?.DocEntry) ||
      !Number.isSafeInteger(result?.DocNum) ||
      result.DocEntry <= 0 ||
      result.DocNum <= 0
    ) {
      throw new Error('SAP did not return a posted production receipt');
    }
    return { DocEntry: result.DocEntry, DocNum: result.DocNum };
  }

  getProductionReceiptDistributionRules(
    departmentCode: string,
    costItemCode: string,
    session?: SapUserSession,
  ) {
    const filter = [departmentCode, costItemCode]
      .map((code) => `FactorCode eq '${code.replaceAll("'", "''")}'`)
      .join(' or ');
    return this.fetchAllPages<{
      FactorCode: string;
      InWhichDimension: number;
      Active: 'tYES' | 'tNO';
    }>(
      `DistributionRules?$select=FactorCode,InWhichDimension,Active&$filter=${encodeURIComponent(filter)}`,
      session,
    );
  }

  async getProductionReceiptsForEntry(
    orderEntry: number,
    reference?: string,
    session?: SapUserSession,
  ) {
    if (!Number.isSafeInteger(orderEntry) || orderEntry <= 0) {
      throw new Error('Invalid SAP production order entry');
    }
    const header = SAP_PRODUCTION_RECEIPT;
    const lines = SAP_PRODUCTION_RECEIPT_LINES;
    const filters = [
      `${header}/DocEntry eq ${lines}/DocEntry`,
      `${lines}/BaseType eq ${SAP_PRODUCTION_ORDER_BASE_TYPE}`,
      `${lines}/BaseEntry eq ${orderEntry}`,
    ];
    if (reference) {
      filters.push(
        `${header}/Reference2 eq '${reference.replaceAll("'", "''")}'`,
      );
    }
    const rows = await this.fetchAllPages<SapProductionReceiptRow>(
      `$crossjoin(${header},${lines})?` +
        `$expand=${header}($select=DocEntry,DocNum,DocDate,Comments,JournalMemo,Reference2),` +
        `${lines}($select=LineNum,BaseType,BaseEntry,ItemCode,ItemDescription,Quantity,Price,WarehouseCode,MeasureUnit,Currency,CostingCode,CostingCode2,U_SL,U_HSD,U_NSX)` +
        `&$filter=${encodeURIComponent(filters.join(' and '))}` +
        `&$orderby=${encodeURIComponent(`${header}/DocEntry desc,${lines}/LineNum asc`)}`,
      session,
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

  private async fetchAllPages<T = any>(
    endpoint: string,
    session?: SapUserSession,
  ): Promise<T[]> {
    const results: T[] = [];
    let nextEndpoint: string | null = endpoint;

    while (nextEndpoint) {
      const data = await this.get<SapPagedResponse<T>>(nextEndpoint, session);
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
    session?: SapUserSession,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const token = session?.sessionId ?? (await this.getValidToken());

    try {
      const response = await this.sapApi.get<T>(endpoint, {
        ...(session && this.personalRequestOptions()),
        headers: this.buildSessionHeaders(token, session?.routeId),
      });

      if (!response.data) {
        throw new Error('No data found');
      }

      return response.data;
    } catch (error) {
      if (
        !session &&
        retryOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        this.clearSession();
        return this.get<T>(endpoint, undefined, false);
      }

      throw error;
    }
  }

  private async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    session?: SapUserSession,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const token = session?.sessionId ?? (await this.getValidToken());
    try {
      const response = await this.sapApi.post<T>(endpoint, body, {
        ...(session && this.personalRequestOptions()),
        headers: this.buildSessionHeaders(token, session?.routeId),
      });
      return response.data;
    } catch (error) {
      if (
        !session &&
        retryOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        this.clearSession();
        return this.post<T>(endpoint, body, undefined, false);
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

  async loginPersonal(username: string, password: string) {
    if (!process.env.SAP_COMPANY_DB)
      throw new Error('SAP_COMPANY_DB is not configured');
    const response = await this.sapApi.post<{
      SessionId?: string;
      SessionTimeout?: number;
    }>(
      'Login',
      {
        CompanyDB: process.env.SAP_COMPANY_DB,
        UserName: username,
        Password: password,
      },
      this.personalRequestOptions(),
    );
    const sessionId = response.data?.SessionId;
    if (!sessionId || !/^[\w-]+$/.test(sessionId)) {
      throw new Error('SAP did not provide a valid session');
    }
    const routeId = response.headers['set-cookie']
      ?.map((cookie) => /^ROUTEID=([\w.-]+);?/i.exec(cookie)?.[1])
      .find(Boolean);
    const timeout = Number(response.data.SessionTimeout);
    return {
      session: { sessionId, routeId },
      timeoutMinutes: Number.isFinite(timeout) && timeout > 0 ? timeout : 30,
    };
  }

  private personalRequestOptions() {
    const base = this.sapApi.defaults.baseURL;
    if (!base || new URL(base).protocol !== 'https:') {
      throw new Error('Personal SAP login requires HTTPS');
    }
    if (!this.personalAgent) {
      const caFile = process.env.SAP_PERSONAL_TLS_CA_FILE;
      const serverName = process.env.SAP_PERSONAL_TLS_SERVER_NAME;
      this.personalAgent = new https.Agent({
        rejectUnauthorized: true,
        ...(caFile && { ca: readFileSync(caFile) }),
        ...(serverName && {
          checkServerIdentity: (_hostname, cert) =>
            checkServerIdentity(serverName, cert),
        }),
      });
    }
    return { httpsAgent: this.personalAgent, maxRedirects: 0 };
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

  private buildSessionHeaders(token: string, routeId?: string) {
    return {
      Cookie: routeId
        ? `B1SESSION=${token}; ROUTEID=${routeId}`
        : `B1SESSION=${token}`,
      'B1S-PageSize': Number(process.env.SAP_B1_PAGE_SIZE ?? 10000),
    };
  }

  private clearSession() {
    this.sessionCache.token = null;
    this.sessionCache.expiresAt = null;
  }
}
