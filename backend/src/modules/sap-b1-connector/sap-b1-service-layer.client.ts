import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

type SapPagedResponse<T> = {
  value?: T[];
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
      'Items?$select=ItemCode,ItemName,SalesUnit,U_MDK,ManageBatchNumbers',
    );
  }

  async getProductionOrders() {
    return this.fetchAllPages(
      'ProductionOrders?$select=DocumentNumber,ItemNo,ProductionOrderStatus,ProductionOrderType,PlannedQuantity,PostingDate,DueDate,ProductionOrderOrigin,Warehouse,InventoryUOM,JournalRemarks,CreationDate,StartDate,ProductDescription,U_YCDL,U_HSD,U_NSX,U_SL,U_MDK,U_QCHH,U_MCT,U_GC,U_LSXTP,U_MLSX,U_LLSX,U_NPC,U_NHT,U_CL,Remarks',
    );
  }

  async getProductionOrderById<T = any>(id: number | string): Promise<T> {
    return this.get<T>(`ProductionOrders(${id})`);
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
      nextEndpoint = data['odata.nextLink'] ?? null;
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
