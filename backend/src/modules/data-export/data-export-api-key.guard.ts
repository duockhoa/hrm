import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Authenticates read-only integrations such as Google Apps Script.
 * This key is intentionally separate from user JWT credentials.
 */
@Injectable()
export class DataExportApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configuredApiKey = process.env.DATA_EXPORT_API_KEY;

    if (!configuredApiKey) {
      throw new ServiceUnavailableException(
        'Data export API key is not configured',
      );
    }

    const request = context.switchToHttp().getRequest();
    const providedApiKey = request.headers['x-data-export-api-key'];

    if (
      typeof providedApiKey !== 'string' ||
      !this.isEqual(providedApiKey, configuredApiKey)
    ) {
      throw new UnauthorizedException('Invalid data export API key');
    }

    return true;
  }

  private isEqual(providedApiKey: string, configuredApiKey: string): boolean {
    const provided = Buffer.from(providedApiKey);
    const configured = Buffer.from(configuredApiKey);

    return (
      provided.length === configured.length &&
      timingSafeEqual(provided, configured)
    );
  }
}
