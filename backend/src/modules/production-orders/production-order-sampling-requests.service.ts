import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSamplingRequestDto } from './dto/create-production-order-sampling-request.dto';

type AppsScriptPyclmResponse = {
  status?: string;
  url?: string;
  message?: string;
  [key: string]: unknown;
};

type AuthenticatedUser = {
  id?: number | string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

const DEFAULT_PYCLM_API_TIMEOUT_MS = 30000;

const samplingRequestSenderSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const samplingRequestInclude = {
  productionOrder: {
    include: {
      item: true,
    },
  },
  sender: {
    select: samplingRequestSenderSelect,
  },
} satisfies Prisma.ProductionOrderSamplingRequestsInclude;

@Injectable()
export class ProductionOrderSamplingRequestsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSamplingRequests.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: samplingRequestInclude,
      orderBy: {
        sent_at: 'desc',
      },
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSamplingRequestDto = {},
    user?: AuthenticatedUser,
  ) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id: productionOrderId,
        },
        include: {
          item: true,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }

    // const existingSentRequest =
    //   await this.prismaService.productionOrderSamplingRequests.findFirst({
    //     where: {
    //       production_order_id: productionOrderId,
    //       status: 'sent',
    //     },
    //     include: samplingRequestInclude,
    //     orderBy: {
    //       sent_at: 'desc',
    //     },
    //   });

    // if (existingSentRequest && !this.shouldResend(dto.resend)) {
    //   return {
    //     status: 'already_sent',
    //     samplingRequest: existingSentRequest,
    //   };
    // }

    const payload = this.buildPyclmPayload(productionOrder, dto, user);
    const providerResponse = await this.sendPyclmRequest(payload);

    const samplingRequest =
      await this.prismaService.productionOrderSamplingRequests.create({
        data: {
          production_order_id: productionOrderId,
          sender_id: this.normalizeUserId(user),
          location: payload.location,
          google_doc_url: providerResponse.url,
          status: 'sent',
          sent_at: new Date(),
        },
        include: samplingRequestInclude,
      });

    return {
      status: 'success',
      samplingRequest,
    };
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id: productionOrderId,
        },
        select: {
          id: true,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private buildPyclmPayload(
    productionOrder: Prisma.ProductionOrdersGetPayload<{
      include: { item: true };
    }>,
    dto: CreateProductionOrderSamplingRequestDto,
    user?: AuthenticatedUser,
  ) {
    return {
      itemCode: productionOrder.item_code,
      itemName: productionOrder.item?.item_name ?? productionOrder.description,
      quantity: this.formatQuantity(
        productionOrder.planned_quatity,
        productionOrder.unit,
      ),
      batchNumber: productionOrder.lot_no,
      expiryDate: productionOrder.expire_date ?? '',
      sender: this.getSenderName(user),
      location:
        this.normalizeOptionalString(dto.location) ??
        productionOrder.warehouse ??
        '',
      emailRecipients: this.getEmailRecipients(user),
    };
  }

  private async sendPyclmRequest(payload: {
    itemCode: string;
    itemName: string;
    quantity: string;
    batchNumber: string;
    expiryDate: string;
    sender: string;
    location: string;
    emailRecipients: string;
  }): Promise<Required<Pick<AppsScriptPyclmResponse, 'url'>>> {
    try {
      const response = await axios.post<AppsScriptPyclmResponse>(
        this.pyclmApiUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.pyclmApiTimeoutMs,
        },
      );

      if (response.data?.status === 'error') {
        throw new BadGatewayException(
          response.data.message || 'PYCLM provider returned an error',
        );
      }

      const url =
        typeof response.data?.url === 'string' ? response.data.url.trim() : '';

      if (!url) {
        throw new BadGatewayException(
          'PYCLM provider did not return a file URL',
        );
      }

      return {
        url,
      };
    } catch (error) {
      this.handlePyclmApiError(error);
    }
  }

  private formatQuantity(quantity: number, unit?: string | null) {
    return [quantity, unit]
      .filter((part) => part !== null && part !== undefined && part !== '')
      .join(' ');
  }

  private normalizeOptionalString(value?: string | null) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue || null;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return userId;
  }

  private getSenderName(user?: AuthenticatedUser) {
    return (
      this.normalizeOptionalString(user?.name) ??
      this.normalizeOptionalString(user?.username) ??
      this.normalizeOptionalString(user?.email) ??
      ''
    );
  }

  private getEmailRecipients(user?: AuthenticatedUser) {
    const recipients = [
      ...this.normalizeEmailRecipients(
        process.env.APPS_SCRIPT_PYCLM_EMAIL_RECIPIENTS,
      ),
      ...this.normalizeEmailRecipients(user?.email),
    ];
    const uniqueRecipients = [...new Set(recipients)];

    return uniqueRecipients.join(',');
  }

  private normalizeEmailRecipients(value?: string | null) {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean);
  }

  private shouldResend(value?: boolean | string | null) {
    return value === true || value === 'true' || value === '1';
  }

  private get pyclmApiUrl() {
    const apiUrl = process.env.APPS_SCRIPT_PYCLM_API_URL?.trim();

    if (!apiUrl) {
      throw new InternalServerErrorException(
        'APPS_SCRIPT_PYCLM_API_URL is not configured',
      );
    }

    return apiUrl;
  }

  private get pyclmApiTimeoutMs() {
    const timeout = Number(process.env.APPS_SCRIPT_PYCLM_TIMEOUT_MS);

    if (Number.isNaN(timeout) || timeout <= 0) {
      return DEFAULT_PYCLM_API_TIMEOUT_MS;
    }

    return timeout;
  }

  private handlePyclmApiError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<AppsScriptPyclmResponse>;
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'PYCLM API request failed';

      throw new BadGatewayException(message);
    }

    throw new InternalServerErrorException('PYCLM API request failed');
  }
}
