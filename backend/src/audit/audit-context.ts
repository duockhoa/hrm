import { AsyncLocalStorage } from 'node:async_hooks';
import type { ProductionOrderScope } from '../access/production-order-scope';

export interface AuditRequest {
  user?: { id?: number; name?: string; username?: string };
  ip?: string;
  headers?: { 'user-agent'?: string };
  body?: { reason?: unknown };
}

export interface AuditContext {
  request: AuditRequest;
  requestId: string;
  productionOrderScope?: Promise<ProductionOrderScope>;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();
