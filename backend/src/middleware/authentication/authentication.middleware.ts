import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { auditContext, AuditRequest } from '../../audit/audit-context';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  use(req: AuditRequest, res: unknown, next: () => void) {
    auditContext.run({ request: req, requestId: randomUUID() }, next);
  }
}
