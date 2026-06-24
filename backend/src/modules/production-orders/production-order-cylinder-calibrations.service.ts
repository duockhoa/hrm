import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderCylinderCalibrationDto } from './dto/create-production-order-cylinder-calibration.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const CALIBRATION_DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,4})?$/;
const CALIBRATION_INTEGER_DIGITS = 6;
const CYLINDER_CODE_MAX_LENGTH = 100;

const cylinderCalibrationCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const cylinderCalibrationInclude = {
  createdBy: {
    select: cylinderCalibrationCreatorSelect,
  },
} satisfies Prisma.ProductionOrderCylinderCalibrationsInclude;

@Injectable()
export class ProductionOrderCylinderCalibrationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderCylinderCalibrations.findUnique({
      where: {
        production_order_id: productionOrderId,
      },
      include: cylinderCalibrationInclude,
    });
  }

  async upsert(
    productionOrderId: number,
    dto: CreateProductionOrderCylinderCalibrationDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const cylinderCode = this.normalizeOptionalCylinderCode(dto?.cylinder_code);
    const calibrationNumber = this.normalizeRequiredCalibrationNumber(
      dto?.calibration_number,
    );

    return this.prismaService.productionOrderCylinderCalibrations.upsert({
      where: {
        production_order_id: productionOrderId,
      },
      create: {
        production_order_id: productionOrderId,
        cylinder_code: cylinderCode,
        calibration_number: calibrationNumber,
        created_by_id: this.normalizeUserId(user),
      },
      update: {
        cylinder_code: cylinderCode,
        calibration_number: calibrationNumber,
      },
      include: cylinderCalibrationInclude,
    });
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

  private normalizeOptionalCylinderCode(value: unknown) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('cylinder_code must be a string');
    }

    const cylinderCode = value.trim();

    if (cylinderCode.length > CYLINDER_CODE_MAX_LENGTH) {
      throw new BadRequestException(
        `cylinder_code must be at most ${CYLINDER_CODE_MAX_LENGTH} characters`,
      );
    }

    return cylinderCode;
  }

  private normalizeRequiredCalibrationNumber(value: unknown) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException('calibration_number is required');
    }

    let normalizedValue: string;

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new BadRequestException(
          'calibration_number must be a valid number',
        );
      }

      normalizedValue = String(value);
    } else if (typeof value === 'string') {
      normalizedValue = value.trim().replace(',', '.');
    } else {
      throw new BadRequestException(
        'calibration_number must fit DECIMAL(10, 4) with up to 4 decimal places',
      );
    }

    if (!CALIBRATION_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        'calibration_number must fit DECIMAL(10, 4) with up to 4 decimal places',
      );
    }

    const [integerPart] = normalizedValue.replace('-', '').split('.');

    if (integerPart.length > CALIBRATION_INTEGER_DIGITS) {
      throw new BadRequestException(
        'calibration_number must fit DECIMAL(10, 4)',
      );
    }

    return new Prisma.Decimal(normalizedValue);
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
