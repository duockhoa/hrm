import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

type ScbAuthResponse = {
  accessToken?: unknown;
};

@Injectable()
export class RegistrationNumbersAuthService {
  private readonly logger = new Logger(RegistrationNumbersAuthService.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  async getAccessToken(forceRefresh = false): Promise<string | null> {
    if (!forceRefresh && this.accessToken && !this.isTokenExpiringSoon()) {
      return this.accessToken;
    }

    return this.login();
  }

  clearAccessToken() {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
  }

  private async login(): Promise<string | null> {
    const loginUrl = process.env.SCB_AUTH_LOGIN_URL?.trim();
    const username = process.env.SCB_AUTH_USERNAME?.trim();
    const password = process.env.SCB_AUTH_PASSWORD?.trim();

    if (!loginUrl) {
      this.logger.warn(
        'Skipped SCB auth login: missing SCB_AUTH_LOGIN_URL',
      );
      return null;
    }

    if (!username || !password) {
      this.logger.warn(
        'Skipped SCB auth login: missing SCB_AUTH_USERNAME or SCB_AUTH_PASSWORD',
      );
      return null;
    }

    try {
      const response = await axios.post(loginUrl, {
        username,
        password,
      });
      const accessToken = this.extractAccessToken(response.data);

      if (!accessToken) {
        this.logger.warn('SCB auth login response missing accessToken');
        return null;
      }

      this.accessToken = accessToken;
      this.accessTokenExpiresAt = this.getJwtExpiresAt(accessToken);

      return accessToken;
    } catch (error) {
      this.logger.error(
        'Failed to login SCB auth',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private extractAccessToken(payload: unknown): string | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const authResponse = payload as ScbAuthResponse;

    return typeof authResponse.accessToken === 'string'
      ? authResponse.accessToken
      : null;
  }

  private getJwtExpiresAt(token: string) {
    const payload = token.split('.')[1];

    if (!payload) {
      return 0;
    }

    try {
      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as { exp?: unknown };

      return typeof decodedPayload.exp === 'number'
        ? decodedPayload.exp * 1000
        : 0;
    } catch {
      return 0;
    }
  }

  private isTokenExpiringSoon() {
    if (!this.accessTokenExpiresAt) {
      return true;
    }

    return Date.now() >= this.accessTokenExpiresAt - 60_000;
  }
}
