import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditRequest {
  user?: { id?: number; name?: string; username?: string };
  ip?: string;
  headers?: { 'user-agent'?: string };
  body?: { reason?: unknown };
}

export interface AuditContext {
  request: AuditRequest;
  requestId: string;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();
