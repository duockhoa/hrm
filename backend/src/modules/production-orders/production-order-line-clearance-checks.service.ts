import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderLineClearanceCheckDto } from './dto/create-production-order-line-clearance-check.dto';
import { UpdateProductionOrderLineClearanceCheckDto } from './dto/update-production-order-line-clearance-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const lineClearanceCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const lineClearanceCheckInclude = {
  createdBy: {
    select: lineClearanceCheckCreatorSelect,
  },
  previousProductionOrder: {
    select: {
      id: true,
      lot_no: true,
      production_order_code: true,
      description: true,
    },
  },
} satisfies Prisma.ProductionOrderLineClearanceChecksInclude;

@Injectable()
export class ProductionOrderLineClearanceChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderLineClearanceChecks.findUnique({
        where: { id: checkId },
        include: lineClearanceCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Line clearance check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderLineClearanceChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: lineClearanceCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderLineClearanceCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    const previousOrder = await this.resolvePreviousProductionOrder(
      dto?.previous_production_order_id,
      productionOrderId,
    );

    return this.prismaService.productionOrderLineClearanceChecks.create({
      data: {
        production_order_id: productionOrderId,
        check_type: this.normalizeRequiredString(
          dto?.check_type,
          'check_type',
          100,
        ),
        requirement: this.normalizeRequiredText(
          dto?.requirement,
          'requirement',
        ),
        result: this.normalizeResult(dto?.result),
        previous_production_order_id: previousOrder?.id,
        previous_lot_no:
          previousOrder?.lot_no ??
          this.normalizeOptionalString(
            dto?.previous_lot_no,
            'previous_lot_no',
            100,
          ),
        created_by_id: this.normalizeUserId(user),
      },
      include: lineClearanceCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderLineClearanceCheckDto,
  ) {
    const existingCheck = await this.findById(checkId);
    const data = await this.normalizeUpdateData(
      dto,
      existingCheck.production_order_id,
    );

    return this.prismaService.productionOrderLineClearanceChecks.update({
      where: { id: checkId },
      data,
      include: lineClearanceCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderLineClearanceChecks.delete({
      where: { id: checkId },
      include: lineClearanceCheckInclude,
    });
  }

  private async normalizeUpdateData(
    dto: UpdateProductionOrderLineClearanceCheckDto,
    productionOrderId: number,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderLineClearanceChecksUncheckedUpdateInput =
      {};

    if ('check_type' in updateDto) {
      data.check_type = this.normalizeRequiredString(
        updateDto.check_type,
        'check_type',
        100,
      );
    }

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeRequiredText(
        updateDto.requirement,
        'requirement',
      );
    }

    if ('result' in updateDto) {
      data.result = this.normalizeResult(updateDto.result);
    }

    if ('previous_production_order_id' in updateDto) {
      const previousOrder = await this.resolvePreviousProductionOrder(
        updateDto.previous_production_order_id,
        productionOrderId,
      );
      data.previous_production_order_id = previousOrder?.id ?? null;

      if (previousOrder) {
        data.previous_lot_no = previousOrder.lot_no;
      }
    }

    if ('previous_lot_no' in updateDto) {
      data.previous_lot_no = this.normalizeOptionalString(
        updateDto.previous_lot_no,
        'previous_lot_no',
        100,
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async resolvePreviousProductionOrder(
    value: unknown,
    currentProductionOrderId: number,
  ) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const previousProductionOrderId = Number(value);
    if (
      !Number.isInteger(previousProductionOrderId) ||
      previousProductionOrderId <= 0
    ) {
      throw new BadRequestException(
        'previous_production_order_id must be a positive integer',
      );
    }

    if (previousProductionOrderId === currentProductionOrderId) {
      throw new BadRequestException(
        'previous_production_order_id must be different from the current production order',
      );
    }

    const previousOrder = await this.prismaService.productionOrders.findUnique({
      where: { id: previousProductionOrderId },
      select: { id: true, lot_no: true },
    });

    if (!previousOrder) {
      throw new NotFoundException('Previous production order not found');
    }

    return previousOrder;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    const normalizedValue = this.normalizeRequiredText(value, fieldName);

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizeOptionalString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      return null;
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeResult(value: unknown) {
    const normalizedValue = this.normalizeRequiredText(value, 'result')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd');

    if (normalizedValue === 'dat') {
      return 'Đạt';
    }

    if (normalizedValue === 'khong dat') {
      return 'Không đạt';
    }

    throw new BadRequestException('result must be "Đạt" or "Không đạt"');
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
