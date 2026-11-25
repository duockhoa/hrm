import { HttpException, HttpStatus } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import type { SapUserSession } from '../sap-b1-connector/sap-b1-service-layer.client';

const cookieName = 'wms_sap_receipt_session';
const cookiePath = '/production-orders/finished-product-summaries';
const maxAge = 30 * 60 * 1000;

type Session = SapUserSession & { username: string; expiresAt: number };

export class SapReceiptSessionRequired extends HttpException {
  constructor() {
    super(
      {
        code: 'SAP_SESSION_REQUIRED',
        message: 'Vui lòng đăng nhập SAP để nhập kho.',
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
}

function sessionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return createHmac('sha256', secret)
    .update('wms-sap-receipt-session-v1')
    .digest();
}

function associatedData(userId: number) {
  return JSON.stringify([
    userId,
    process.env.SAP_COMPANY_DB,
    process.env.SAP_SERVICE_LAYER_URL,
  ]);
}

function cookieOptions(req: Request): CookieOptions {
  const secure =
    req.secure ||
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(req.hostname);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    partitioned: secure,
    path: cookiePath,
  };
}

export function clearSapReceiptSession(req: Request, res: Response) {
  res.clearCookie(cookieName, cookieOptions(req));
}

export function saveSapReceiptSession(
  req: Request,
  res: Response,
  userId: number,
  username: string,
  session: SapUserSession,
  sapTimeoutMinutes: number,
) {
  const duration = Math.min(sapTimeoutMinutes * 60 * 1000, maxAge);
  const value: Session = {
    ...session,
    username,
    expiresAt: Date.now() + duration,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  cipher.setAAD(Buffer.from(associatedData(userId)));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  res.cookie(
    cookieName,
    Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url'),
    {
      ...cookieOptions(req),
      maxAge: duration,
    },
  );
  return { active: true, username };
}

export function readSapReceiptSession(
  req: Request,
  userId: number,
): Session | null {
  const token = req.headers.cookie?.match(
    /(?:^|;\s*)wms_sap_receipt_session=([\w-]+)(?=;|$)/,
  )?.[1];
  if (!token) return null;
  try {
    const data = Buffer.from(token, 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      sessionKey(),
      data.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from(associatedData(userId)));
    decipher.setAuthTag(data.subarray(12, 28));
    const session = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString('utf8'),
    ) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}
