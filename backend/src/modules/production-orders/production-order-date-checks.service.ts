import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ApproveProductionOrderDateCheckDto } from './dto/approve-production-order-date-check.dto';
import { CreateProductionOrderDateCheckDto } from './dto/create-production-order-date-check.dto';
import { UpdateProductionOrderDateCheckDto } from './dto/update-production-order-date-check.dto';
import {
  getDateCheckImageLookupPaths,
  getDateCheckRequestFileLookupPaths,
  removeStoredDateCheckImage,
  removeStoredDateCheckImages,
  removeStoredDateCheckRequestFile,
  resolveDateCheckImageFile,
  resolveDateCheckRequestFile,
} from './production-order-date-check-upload.config';

type AuthenticatedUser = {
  id?: number | string | null;
};

const DATE_CHECK_APPROVAL_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

const productionOrderDateCheckUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
  department: true,
  position: true,
  status: true,
};

const productionOrderDateCheckInclude = {
  productionOrder: {
    include: {
      item: true,
    },
  },
  createdBy: {
    select: productionOrderDateCheckUserSelect,
  },
  approvedBy: {
    select: productionOrderDateCheckUserSelect,
  },
  images: {
    include: {
      createdBy: {
        select: productionOrderDateCheckUserSelect,
      },
    },
    orderBy: [
      {
        created_at: 'asc' as const,
      },
      {
        id: 'asc' as const,
      },
    ],
  },
} satisfies Prisma.ProductionOrderDateChecksInclude;

@Injectable()
export class ProductionOrderDateChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const dateCheck =
      await this.prismaService.productionOrderDateChecks.findUnique({
        where: {
          id: checkId,
        },
        include: productionOrderDateCheckInclude,
      });

    if (!dateCheck) {
      throw new NotFoundException('Date check not found');
    }

    return dateCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDateChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: productionOrderDateCheckInclude,
      orderBy: [
        {
          checked_at: 'desc',
        },
        {
          created_at: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findImageFile(filename: string) {
    const imagePaths = getDateCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const image =
      await this.prismaService.productionOrderDateCheckImages.findFirst({
        where: {
          image_path: {
            in: imagePaths,
          },
        },
        select: {
          id: true,
        },
      });

    if (!image) {
      return null;
    }

    return resolveDateCheckImageFile(filename);
  }

  async findRequestFile(filename: string) {
    const requestFilePaths = getDateCheckRequestFileLookupPaths(filename);

    if (requestFilePaths.length === 0) {
      return null;
    }

    const dateCheck =
      await this.prismaService.productionOrderDateChecks.findFirst({
        where: {
          request_file_path: {
            in: requestFilePaths,
          },
        },
        select: {
          id: true,
        },
      });

    if (!dateCheck) {
      return null;
    }

    return resolveDateCheckRequestFile(filename);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderDateCheckDto,
    user: AuthenticatedUser | undefined,
    files: {
      requestFilePath?: string;
    } = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const userId = this.normalizeUserId(user);

    const createdDateCheck =
      await this.prismaService.productionOrderDateChecks.create({
        data: {
          production_order_id: productionOrderId,
          package_type: this.normalizeRequiredString(
            dto?.package_type,
            'package_type',
          ),
          request_file_path: files.requestFilePath ?? null,
          approval_status: DATE_CHECK_APPROVAL_STATUS.pending,
          created_by_id: userId,
        },
        include: productionOrderDateCheckInclude,
      });

    if (!createdDateCheck) {
      throw new NotFoundException('Date check not found');
    }

    return createdDateCheck;
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderDateCheckDto,
    files: {
      requestFilePath?: string;
    } = {},
  ) {
    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const data: Prisma.ProductionOrderDateChecksUncheckedUpdateInput = {};

    if (dto.package_type !== undefined) {
      data.package_type = this.normalizeRequiredString(
        dto.package_type,
        'package_type',
      );
    }

    if (files.requestFilePath !== undefined) {
      data.request_file_path = files.requestFilePath;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    const updatedDateCheck =
      await this.prismaService.productionOrderDateChecks.update({
        where: {
          id: checkId,
        },
        data,
        include: productionOrderDateCheckInclude,
      });

    if (
      files.requestFilePath !== undefined &&
      files.requestFilePath !== existingDateCheck.request_file_path
    ) {
      await removeStoredDateCheckRequestFile(
        existingDateCheck.request_file_path,
      );
    }

    return updatedDateCheck;
  }

  async approve(
    checkId: number,
    dto: ApproveProductionOrderDateCheckDto,
    user?: AuthenticatedUser,
  ) {
    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const approvalStatus = this.normalizeApprovalStatus(dto?.approval_status);

    return this.prismaService.productionOrderDateChecks.update({
      where: {
        id: checkId,
      },
      data: {
        approval_status: approvalStatus,
        approved_by_id: this.normalizeUserId(user),
        approved_at: new Date(),
      },
      include: productionOrderDateCheckInclude,
    });
  }

  async delete(checkId: number) {
    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const imagePaths = existingDateCheck.images.map(
      (image) => image.image_path,
    );

    await this.prismaService.productionOrderDateChecks.delete({
      where: {
        id: checkId,
      },
    });

    await Promise.all([
      removeStoredDateCheckRequestFile(existingDateCheck.request_file_path),
      removeStoredDateCheckImages(imagePaths),
    ]);

    return existingDateCheck;
  }

  async addImages(
    checkId: number,
    imagePaths: string[],
    user?: AuthenticatedUser,
  ) {
    if (imagePaths.length === 0) {
      throw new BadRequestException('images are required');
    }

    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const userId = this.normalizeUserId(user);

    await this.prismaService.productionOrderDateCheckImages.createMany({
      data: imagePaths.map((imagePath) => ({
        date_check_id: checkId,
        image_path: imagePath,
        created_by_id: userId,
      })),
    });

    return this.findById(checkId);
  }

  async deleteImage(imageId: number) {
    const image =
      await this.prismaService.productionOrderDateCheckImages.findUnique({
        where: {
          id: imageId,
        },
        include: {
          dateCheck: {
            select: {
              approval_status: true,
            },
          },
        },
      });

    if (!image) {
      throw new NotFoundException('Date check image not found');
    }

    this.ensurePending(image.dateCheck.approval_status);

    await this.prismaService.productionOrderDateCheckImages.delete({
      where: {
        id: imageId,
      },
    });

    await removeStoredDateCheckImage(image.image_path);

    return image;
  }

  private ensurePending(approvalStatus: string) {
    if (approvalStatus !== DATE_CHECK_APPROVAL_STATUS.pending) {
      throw new BadRequestException(
        'Date check is already approved or rejected',
      );
    }
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

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeApprovalStatus(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('approval_status is required');
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue !== DATE_CHECK_APPROVAL_STATUS.approved &&
      normalizedValue !== DATE_CHECK_APPROVAL_STATUS.rejected
    ) {
      throw new BadRequestException(
        'approval_status must be approved or rejected',
      );
    }

    return normalizedValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
