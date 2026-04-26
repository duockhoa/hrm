import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosError, Method } from 'axios';

type RequestOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
};

@Injectable()
export class ExternalApiIntegration {
  private readonly baseUrl = process.env.EXTERNAL_API_URL;
  private readonly apiToken = process.env.EXTERNAL_API_TOKEN;

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: Method,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new HttpException(
        'EXTERNAL_API_URL is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const response = await axios.request<T>({
        method,
        url: this.buildUrl(path, options?.query),
        headers: this.buildHeaders(options?.headers),
        data: body,
      });

      if (response.status === HttpStatus.NO_CONTENT) {
        return undefined as T;
      }

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path, this.baseUrl);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  private buildHeaders(
    headers?: Record<string, string>,
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
      ...headers,
    };
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status =
        axiosError.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const data = axiosError.response?.data;
      const message =
        data?.message ??
        data?.error ??
        axiosError.message ??
        'External API request failed';

      throw new HttpException(message, status);
    }

    throw new HttpException(
      'External API request failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
